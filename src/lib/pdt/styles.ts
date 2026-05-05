import {
  BorderStyle,
  type IParagraphStyleOptions,
  type IRunOptions,
  LineRuleType,
  ShadingType,
} from "docx";

export const FONT_MAIN = "Times New Roman";
export const FONT_SIZE_BODY = 24; // half-points → 12pt
export const FONT_SIZE_SMALL = 20; // 10pt
export const FONT_SIZE_H1 = 28; // 14pt
export const FONT_SIZE_H2 = 26; // 13pt
export const FONT_SIZE_COVER_TITLE = 36; // 18pt

export const LINE_SPACING = {
  line: 276,
  lineRule: LineRuleType.AUTO,
};

export const SPACE_AFTER_PARA = 120; // 6pt

export const runBody: Partial<IRunOptions> = {
  font: FONT_MAIN,
  size: FONT_SIZE_BODY,
};

export const runBold: Partial<IRunOptions> = {
  ...runBody,
  bold: true,
};

export const runSmall: Partial<IRunOptions> = {
  font: FONT_MAIN,
  size: FONT_SIZE_SMALL,
};

export const paragraphStyle: Partial<IParagraphStyleOptions> = {
  run: {},
};

export const TABLE_HEADER_SHADING = {
  type: ShadingType.SOLID,
  color: "D9D9D9",
};

export const TABLE_BORDER_THIN = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: "000000",
};
