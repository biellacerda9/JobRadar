import {
  extractRawText,
  UnsupportedFileTypeError,
} from "../services/curriculoParser.js";
import {
  buildMinimalPdf,
  buildMinimalDocx,
} from "../test-helpers/buildTestFiles.js";

describe("extractRawText", () => {
  it("extracts text from a PDF", async () => {
    const pdf = buildMinimalPdf("TESTE CURRICULO PDF");

    const text = await extractRawText(pdf, "application/pdf");

    expect(text).toContain("TESTE CURRICULO PDF");
  });

  it("extracts text from a DOCX", async () => {
    const docx = await buildMinimalDocx("TESTE CURRICULO DOCX");

    const text = await extractRawText(
      docx,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    expect(text).toContain("TESTE CURRICULO DOCX");
  });

  it("rejects unsupported file types", async () => {
    const buffer = Buffer.from("not a resume");

    await expect(extractRawText(buffer, "text/plain")).rejects.toBeInstanceOf(
      UnsupportedFileTypeError,
    );
  });
});
