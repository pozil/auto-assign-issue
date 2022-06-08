"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _utils = require("./utils");

var _default = (0, _utils.createRule)({
  name: __filename,
  meta: {
    docs: {
      category: 'Best Practices',
      description: 'Disallow specific matchers & modifiers',
      recommended: false
    },
    type: 'suggestion',
    schema: [{
      type: 'object',
      additionalProperties: {
        type: ['string', 'null']
      }
    }],
    messages: {
      restrictedChain: 'Use of `{{ chain }}` is disallowed',
      restrictedChainWithMessage: '{{ message }}'
    }
  },
  defaultOptions: [{}],

  create(context, [restrictedChains]) {
    const reportIfRestricted = (loc, chain) => {
      if (!(chain in restrictedChains)) {
        return false;
      }

      const message = restrictedChains[chain];
      context.report({
        messageId: message ? 'restrictedChainWithMessage' : 'restrictedChain',
        data: {
          message,
          chain
        },
        loc
      });
      return true;
    };

    return {
      CallExpression(node) {
        if (!(0, _utils.isExpectCall)(node)) {
          return;
        }

        const {
          matcher,
          modifier
        } = (0, _utils.parseExpectCall)(node);

        if (matcher && reportIfRestricted(matcher.node.property.loc, matcher.name)) {
          return;
        }

        if (modifier) {
          if (reportIfRestricted(modifier.node.property.loc, modifier.name)) {
            return;
          }

          if (modifier.negation) {
            if (reportIfRestricted(modifier.negation.property.loc, 'not') || reportIfRestricted({
              start: modifier.node.property.loc.start,
              end: modifier.negation.property.loc.end
            }, `${modifier.name}.not`)) {
              return;
            }
          }
        }

        if (matcher && modifier) {
          let chain = modifier.name;

          if (modifier.negation) {
            chain += '.not';
          }

          chain += `.${matcher.name}`;
          reportIfRestricted({
            start: modifier.node.property.loc.start,
            end: matcher.node.property.loc.end
          }, chain);
        }
      }

    };
  }

});

exports.default = _default;