import { describe, expect, it } from 'vitest';
import { ReferenceResolver } from '../src/resolution';
import { matchReference } from '../src/resolution/name-matcher';
import type { QueryBuilder } from '../src/db/queries';
import type { ResolutionContext, UnresolvedRef } from '../src/resolution/types';
import type { Node } from '../src/types';

function method(id: string, name: string, qualifiedName: string, filePath: string): Node {
  return {
    id,
    kind: 'method',
    name,
    qualifiedName,
    filePath,
    language: 'al',
    startLine: 1,
    endLine: 2,
    startColumn: 0,
    endColumn: 0,
    updatedAt: 0,
  };
}

function contextFor(nodes: Node[]): ResolutionContext {
  return {
    getNodesInFile: filePath => nodes.filter(node => node.filePath === filePath),
    getNodesByName: name => nodes.filter(node => node.name === name),
    getNodesByQualifiedName: qualifiedName => nodes.filter(node => node.qualifiedName === qualifiedName),
    getNodesByKind: kind => nodes.filter(node => node.kind === kind),
    fileExists: () => true,
    readFile: () => null,
    getProjectRoot: () => '/project',
    getAllFiles: () => [...new Set(nodes.map(node => node.filePath))],
    getNodesByLowerName: lowerName => nodes.filter(
      node => node.name.toLowerCase() === lowerName.toLowerCase(),
    ),
    getImportMappings: () => [],
  };
}

function call(referenceName: string): UnresolvedRef {
  return {
    fromNodeId: 'caller',
    referenceName,
    referenceKind: 'calls',
    line: 10,
    column: 4,
    filePath: 'caller.al',
    language: 'al',
  };
}

function symbol(
  id: string,
  kind: Node['kind'],
  name: string,
  qualifiedName: string,
  filePath: string,
): Node {
  return {
    id,
    kind,
    name,
    qualifiedName,
    filePath,
    language: 'al',
    startLine: 1,
    endLine: 2,
    startColumn: 0,
    endColumn: 0,
    updatedAt: 0,
  };
}

function resolverFor(nodes: Node[]): ReferenceResolver {
  const queries = {
    getAllFilePaths: () => [...new Set(nodes.map(node => node.filePath))],
    getAllNodeNames: () => [...new Set(nodes.map(node => node.name))],
    getNodesByFile: (filePath: string) => nodes.filter(node => node.filePath === filePath),
    getNodesByName: (name: string) => nodes.filter(node => node.name === name),
    getNodesByLowerName: (name: string) => nodes.filter(
      node => node.name.toLowerCase() === name.toLowerCase(),
    ),
    getNodesByQualifiedNameExact: (qualifiedName: string) => nodes.filter(
      node => node.qualifiedName === qualifiedName,
    ),
    getNodesByKind: (kind: Node['kind']) => nodes.filter(node => node.kind === kind),
    iterateNodesByKind: function* (kind: Node['kind']) {
      yield* nodes.filter(node => node.kind === kind);
    },
    getNodeById: (id: string) => nodes.find(node => node.id === id) ?? null,
  } as unknown as QueryBuilder;
  return new ReferenceResolver('/project', queries);
}

describe('AL resolution', () => {
  it('resolves member calls case-insensitively', () => {
    const target = method('target', 'DoWork', 'Target::DoWork', 'target.al');

    expect(matchReference(call('service.dowork'), contextFor([target]))?.targetNodeId).toBe(target.id);
  });

  it('resolves case-insensitive AL calls through the existing production prefilter', () => {
    const target = method('target', 'DoWork', 'Target::DoWork', 'target.al');
    const receiver = symbol('receiver', 'class', 'Service', 'Service', 'service.al');
    const result = resolverFor([receiver, target]).resolveAll([call('service.dowork')]);

    expect(result.resolved).toHaveLength(1);
    expect(result.resolved[0]?.targetNodeId).toBe(target.id);
  });

  it('resolves quoted member calls case-insensitively', () => {
    const target = method('target', '"Do Work"', 'Service::"Do Work"', 'target.al');

    expect(matchReference(call('service."do work"'), contextFor([target]))?.targetNodeId).toBe(target.id);
  });

  it('does not treat dots inside quoted AL identifiers as member separators', () => {
    const target = method('target', '"Do.Work"', 'Service::"Do.Work"', 'target.al');

    expect(matchReference(call('service."do.work"'), contextFor([target]))?.targetNodeId).toBe(target.id);
    expect(matchReference(call('"do.work"'), contextFor([target]))?.targetNodeId).toBe(target.id);
  });

  it('does not guess when a case-insensitive member name is ambiguous', () => {
    const first = method('first', 'DoWork', 'First::DoWork', 'first.al');
    const second = method('second', 'DOWORK', 'Second::DOWORK', 'second.al');

    expect(matchReference(call('service.dowork'), contextFor([first, second]))).toBeNull();
  });

  it('uses AL using directives to disambiguate object references', () => {
    const currentNamespace = symbol(
      'caller-ns',
      'namespace',
      'Contoso.Extension',
      'Contoso.Extension',
      'caller.al',
    );
    const wrong = symbol(
      'wrong',
      'class',
      'Customer',
      'Nearby.Unrelated::Customer',
      'nearby/customer.al',
    );
    const target = symbol(
      'target',
      'class',
      'Customer',
      'Microsoft.Sales::Customer',
      'base/customer.al',
    );
    const using = symbol(
      'using-sales',
      'import',
      'Microsoft.Sales',
      'Microsoft.Sales',
      'caller.al',
    );
    const ref: UnresolvedRef = {
      ...call('Customer'),
      referenceKind: 'extends',
    };

    expect(
      matchReference(ref, contextFor([currentNamespace, using, wrong, target]))?.targetNodeId,
    ).toBe(target.id);
  });
});
