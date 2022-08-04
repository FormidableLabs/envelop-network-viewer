import { DocumentNode, OperationDefinitionNode } from 'graphql';

// borrowed from https://github.com/apollographql/apollo-client/blob/main/src/utilities/graphql/getFromAST.ts
export function getOperationName(doc: DocumentNode): string | null {
  return (
    doc.definitions
      .filter((definition) => definition.kind === 'OperationDefinition' && definition.name)
      // @ts-ignore
      .map((x: OperationDefinitionNode) => x.name!.value)[0] || null
  );
}
