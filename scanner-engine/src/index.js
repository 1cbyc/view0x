const parser = require('solidity-parser-antlr');

function scanContract(code) {
  const issues = [];

  try {
    const ast = parser.parse(code, { loc: true });

    parser.visit(ast, {
      MemberAccess(node) {
        if (node.expression.name === 'tx' && node.memberName === 'origin') {
          issues.push({
            type: 'dangerous-pattern',
            message: 'Avoid using tx.origin for authentication.',
            location: node.loc
          });
        }
      },
      FunctionDefinition(node) {
        if (!node.body) {
          issues.push({
            type: 'missing-implementation',
            message: `Function "${node.name}" has no implementation.`,
            location: node.loc
          });
        }
      }
    });
  } catch (err) {
    return {
      success: false,
      error: 'Failed to parse Solidity code',
      details: err.message
    };
  }

  return {
    success: true,
    issues
  };
}

module.exports = {
  scanContract
};
