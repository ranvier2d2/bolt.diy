/**
 * Custom ESLint plugin for bolt.diy specific rules
 * Prevents regressions for common issues
 */

export default {
  rules: {
    'no-language-model-v1': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent usage of deprecated LanguageModelV1',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          deprecatedImport: 'LanguageModelV1 is deprecated. Use LanguageModel instead.',
          deprecatedType: 'LanguageModelV1 type is deprecated. Use LanguageModel instead.',
        },
      },
      create(context) {
        return {
          ImportDeclaration(node) {
            if (node.source.value === 'ai') {
              node.specifiers.forEach(spec => {
                if (spec.type === 'ImportSpecifier' && spec.imported.name === 'LanguageModelV1') {
                  context.report({
                    node: spec,
                    messageId: 'deprecatedImport',
                    fix: (fixer) => fixer.replaceText(spec.imported, 'LanguageModel'),
                  });
                }
              });
            }
          },
          TSTypeReference(node) {
            if (node.typeName && node.typeName.name === 'LanguageModelV1') {
              context.report({
                node: node.typeName,
                messageId: 'deprecatedType',
                fix: (fixer) => fixer.replaceText(node.typeName, 'LanguageModel'),
              });
            }
          },
        };
      },
    },

    'no-duplicate-css-classes': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent duplicate CSS class names in JSX className attributes',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          duplicateClasses: 'Duplicate CSS class "{{className}}" found. Remove duplicates.',
        },
      },
      create(context) {
        return {
          JSXAttribute(node) {
            if (node.name.name === 'className' && node.value && node.value.type === 'Literal') {
              const classes = node.value.value.split(/\s+/);
              const duplicates = classes.filter((item, index) => classes.indexOf(item) !== index);
              
              if (duplicates.length > 0) {
                const uniqueClasses = [...new Set(classes)].join(' ');
                context.report({
                  node: node.value,
                  messageId: 'duplicateClasses',
                  data: { className: duplicates[0] },
                  fix: (fixer) => fixer.replaceText(node.value, `"${uniqueClasses}"`),
                });
              }
            }
          },
        };
      },
    },

    'no-legacy-route-paths': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent legacy Remix v1 nested route paths in documentation',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          legacyRoute: 'Use flat-file routing format: app/routes/api.chat.ts instead of app/routes/api/chat.ts',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && node.value.includes('app/routes/api/chat.ts')) {
              context.report({
                node,
                messageId: 'legacyRoute',
                fix: (fixer) => fixer.replaceText(node, node.value.replace('app/routes/api/chat.ts', 'app/routes/api.chat.ts')),
              });
            }
          },
        };
      },
    },

    'no-createdAt-property': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Prevent usage of deprecated createdAt property in ChatMessage',
          category: 'Best Practices',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          deprecatedCreatedAt: 'createdAt property is deprecated. Remove it from ChatMessage objects.',
        },
      },
      create(context) {
        return {
          Property(node) {
            if (node.key.name === 'createdAt' && node.value && node.value.type === 'NewExpression') {
              context.report({
                node,
                messageId: 'deprecatedCreatedAt',
                fix: (fixer) => fixer.remove(node),
              });
            }
          },
        };
      },
    },
  },
};
