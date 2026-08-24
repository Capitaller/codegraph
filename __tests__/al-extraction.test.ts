import { describe, it, expect, beforeAll } from 'vitest';
import { extractFromSource } from '../src/extraction';
import { initGrammars, loadAllGrammars } from '../src/extraction/grammars';

beforeAll(async () => {
  await initGrammars();
  await loadAllGrammars();
});

describe('AL Extraction', () => {
  it('extracts Codeunit and procedure correctly', async () => {
    const source = `
codeunit 50100 "My Test Codeunit"
{
    Access = Public;
    Subtype = Normal;

    trigger OnRun()
    begin
        Message('Hello World');
    end;

    procedure MyFunction(VarParam: Record "Sales Line")
    var
        LocalVar: Integer;
    begin
        LocalVar := 1;
        CalculateRounding(LocalVar);
    end;
}
`;

    const result = await extractFromSource('test.al', source, 'al');
    
    // Should have 1 file node, 1 codeunit class node, and 2 methods (OnRun, MyFunction)
    expect(result.nodes.length).toBeGreaterThanOrEqual(4);
    
    const codeunitNode = result.nodes.find(n => n.kind === 'class' && n.name === '"My Test Codeunit"');
    expect(codeunitNode).toBeDefined();
    
    const myFuncNode = result.nodes.find(n => n.kind === 'method' && n.name === 'MyFunction');
    expect(myFuncNode).toBeDefined();
    
    // Check if the reference to CalculateRounding is picked up
    const refs = result.unresolvedReferences;
    const callRef = refs.find(r => r.referenceName === 'CalculateRounding' && r.referenceKind === 'calls');
    expect(callRef).toBeDefined();
  });
});
