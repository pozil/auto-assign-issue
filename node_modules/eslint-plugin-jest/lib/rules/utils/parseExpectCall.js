"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseExpectCall = exports.isParsedEqualityMatcherCall = exports.isExpectMember = exports.isExpectCall = exports.ModifierName = exports.EqualityMatcher = void 0;

var _utils = require("@typescript-eslint/utils");

var _utils2 = require("../utils");

/**
 * Checks if the given `node` is a valid `ExpectCall`.
 *
 * In order to be an `ExpectCall`, the `node` must:
 *  * be a `CallExpression`,
 *  * have an accessor named 'expect',
 *  * have a `parent`.
 *
 * @param {Node} node
 *
 * @return {node is ExpectCall}
 */
const isExpectCall = node => node.type === _utils.AST_NODE_TYPES.CallExpression && (0, _utils2.isSupportedAccessor)(node.callee, 'expect') && node.parent !== undefined;

exports.isExpectCall = isExpectCall;

const isExpectMember = (node, name) => node.type === _utils.AST_NODE_TYPES.MemberExpression && (0, _utils2.isSupportedAccessor)(node.property, name);
/**
 * Represents all the jest matchers.
 */


exports.isExpectMember = isExpectMember;
let ModifierName;
exports.ModifierName = ModifierName;

(function (ModifierName) {
  ModifierName["not"] = "not";
  ModifierName["rejects"] = "rejects";
  ModifierName["resolves"] = "resolves";
})(ModifierName || (exports.ModifierName = ModifierName = {}));

let EqualityMatcher;
exports.EqualityMatcher = EqualityMatcher;

(function (EqualityMatcher) {
  EqualityMatcher["toBe"] = "toBe";
  EqualityMatcher["toEqual"] = "toEqual";
  EqualityMatcher["toStrictEqual"] = "toStrictEqual";
})(EqualityMatcher || (exports.EqualityMatcher = EqualityMatcher = {}));

const isParsedEqualityMatcherCall = (matcher, name) => (name ? matcher.name === name : EqualityMatcher.hasOwnProperty(matcher.name)) && matcher.arguments !== null && matcher.arguments.length === 1;
/**
 * Represents a parsed expect matcher, such as `toBe`, `toContain`, and so on.
 */


exports.isParsedEqualityMatcherCall = isParsedEqualityMatcherCall;

const parseExpectMember = expectMember => ({
  name: (0, _utils2.getAccessorValue)(expectMember.property),
  node: expectMember
});

const reparseAsMatcher = parsedMember => ({ ...parsedMember,

  /**
   * The arguments being passed to this `Matcher`, if any.
   *
   * If this matcher isn't called, this will be `null`.
   */
  arguments: parsedMember.node.parent.type === _utils.AST_NODE_TYPES.CallExpression ? parsedMember.node.parent.arguments : null
});
/**
 * Re-parses the given `parsedMember` as a `ParsedExpectModifier`.
 *
 * If the given `parsedMember` does not have a `name` of a valid `Modifier`,
 * an exception will be thrown.
 *
 * @param {ParsedExpectMember<ModifierName>} parsedMember
 *
 * @return {ParsedExpectModifier}
 */


const reparseMemberAsModifier = parsedMember => {
  if (isSpecificMember(parsedMember, ModifierName.not)) {
    return parsedMember;
  }
  /* istanbul ignore if */


  if (!isSpecificMember(parsedMember, ModifierName.resolves) && !isSpecificMember(parsedMember, ModifierName.rejects)) {
    // ts doesn't think that the ModifierName.not check is the direct inverse as the above two checks
    // todo: impossible at runtime, but can't be typed w/o negation support
    throw new Error(`modifier name must be either "${ModifierName.resolves}" or "${ModifierName.rejects}" (got "${parsedMember.name}")`);
  }

  const negation = isExpectMember(parsedMember.node.parent, ModifierName.not) ? parsedMember.node.parent : undefined;
  return { ...parsedMember,
    negation
  };
};

const isSpecificMember = (member, specific) => member.name === specific;
/**
 * Checks if the given `ParsedExpectMember` should be re-parsed as an `ParsedExpectModifier`.
 *
 * @param {ParsedExpectMember} member
 *
 * @return {member is ParsedExpectMember<ModifierName>}
 */


const shouldBeParsedExpectModifier = member => ModifierName.hasOwnProperty(member.name);

const parseExpectCall = expect => {
  const expectation = {
    expect
  };

  if (!isExpectMember(expect.parent)) {
    return expectation;
  }

  const parsedMember = parseExpectMember(expect.parent);

  if (!shouldBeParsedExpectModifier(parsedMember)) {
    expectation.matcher = reparseAsMatcher(parsedMember);
    return expectation;
  }

  const modifier = expectation.modifier = reparseMemberAsModifier(parsedMember);
  const memberNode = modifier.negation || modifier.node;

  if (!isExpectMember(memberNode.parent)) {
    return expectation;
  }

  expectation.matcher = reparseAsMatcher(parseExpectMember(memberNode.parent));
  return expectation;
};

exports.parseExpectCall = parseExpectCall;