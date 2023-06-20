module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', '**/typeorm/migrations/*'],
  rules: {
    '@typescript-eslint/no-explicit-any': [
      'error',
      { fixToUnknown: true, ignoreRestArgs: false },
    ],
    '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { accessibility: 'no-public' },
    ],
    "no-empty-function": "off",
    "@typescript-eslint/no-empty-function": "off",
    '@typescript-eslint/member-ordering': ['error', {
      default: [
        "public-static-field",
        "public-static-get",
        "public-static-set",
        "public-static-method",
        "protected-static-field",
        "protected-static-get",
        "protected-static-set",
        "protected-static-method",
        "private-static-field",
        "private-static-get",
        "private-static-set",
        "private-static-method",

        "signature",
        "abstract-field",
        "public-instance-field",
        "protected-instance-field",
        "private-instance-field",

        "public-constructor",
        "protected-constructor",
        "private-constructor",

        "public-abstract-get",
        "public-abstract-set",
        "public-abstract-method",
        "public-instance-get",
        "public-instance-set",
        "public-instance-method",

        "protected-abstract-get",
        "protected-abstract-set",
        "protected-abstract-method",
        "protected-instance-get",
        "protected-instance-set",
        "protected-instance-method",

        "private-instance-get",
        "private-instance-set",
        "private-instance-method",
      ]
    }],
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always',
      },
    ]
  },
};
