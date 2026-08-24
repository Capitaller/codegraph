import type { LanguageExtractor } from '../tree-sitter-types';

export const alExtractor: LanguageExtractor = {
  functionTypes: [],
  classTypes: [
    'codeunit_declaration', 'table_declaration', 'page_declaration',
    'report_declaration', 'xmlport_declaration', 'query_declaration',
    'tableextension_declaration', 'pageextension_declaration',
    'enumextension_declaration', 'reportextension_declaration'
  ],
  methodTypes: ['procedure', 'procedure_declaration', 'trigger', 'trigger_declaration', 'event_declaration'],
  interfaceTypes: ['interface_declaration'],
  structTypes: [],
  enumTypes: ['enum_declaration'],
  typeAliasTypes: [],
  importTypes: [],
  callTypes: ['call_expression', 'call_statement'],
  variableTypes: ['variable_declaration', 'field_declaration'],
  methodsAreTopLevel: false,
  nameField: 'name',
  resolveName: (node) => {
    if ([
      'codeunit_declaration', 'table_declaration', 'page_declaration',
      'report_declaration', 'xmlport_declaration', 'query_declaration',
      'tableextension_declaration', 'pageextension_declaration',
      'enumextension_declaration', 'reportextension_declaration'
    ].includes(node.type)) {
      const objName = node.childForFieldName('object_name');
      if (objName) return objName.text;
    }
    return undefined;
  },
  bodyField: 'body',
  paramsField: 'parameters',
};
