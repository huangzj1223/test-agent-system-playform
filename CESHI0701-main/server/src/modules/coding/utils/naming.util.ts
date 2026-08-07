/**
 * 代码生成器 - 命名转换工具
 *
 * 所有命名从 IR 单一来源推导，保证生成代码的命名确定性。
 */

/** 把任意命名拆成单词数组（处理 PascalCase/camelCase/snake_case/kebab-case） */
function splitWords(input: string): string[] {
  return input
    // 连续大写后接大写+小写时切分：APIKey -> API Key，XMLParser -> XML Parser
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // 小写/数字与大写之间切分：dictType -> dict Type
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // 下划线、连字符转空格
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

/** PascalCase：dict_type -> DictType */
export function pascalCase(input: string): string {
  return splitWords(input)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** camelCase：dict_type -> dictType */
export function camelCase(input: string): string {
  const p = pascalCase(input);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

/** kebab-case：DictType -> dict-type */
export function kebabCase(input: string): string {
  return splitWords(input).join('-');
}

/** snake_case：DictType -> dict_type */
export function snakeCase(input: string): string {
  return splitWords(input).join('_');
}
