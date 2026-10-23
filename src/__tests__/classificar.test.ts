import { classificarStack } from "../scraper/classificar.js";

describe("classificarStack", () => {
  it("finds technologies regardless of case", () => {
    expect(
      classificarStack("Requisitos: NODE.JS, typescript e PostgreSQL."),
    ).toEqual(["TypeScript", "Node.js", "PostgreSQL"]);
  });

  it("does not match a technology inside a longer word", () => {
    // "Java" inside "JavaScript", "SQL" inside "PostgreSQL", "Git" inside "digital"
    expect(classificarStack("JavaScript, PostgreSQL, marketing digital")).toEqual([
      "JavaScript",
      "PostgreSQL",
    ]);
  });

  it("matches when Java and JavaScript both appear", () => {
    expect(classificarStack("Java e JavaScript")).toEqual(["JavaScript", "Java"]);
  });

  it("handles Gupy's glued sections (no space after the period)", () => {
    expect(classificarStack("crescimento no mercado.Node.js avançado")).toEqual([
      "Node.js",
    ]);
  });

  it("matches symbols in names like C# and .NET", () => {
    expect(classificarStack("Experiência com C# e .NET Core")).toEqual([
      "C#",
      ".NET",
    ]);
  });

  it("does not treat the word 'go' or 'Google' as the Go language", () => {
    expect(classificarStack("Vamos go-live com o Google Analytics")).toEqual([]);
  });

  it("returns an empty list for non-tech jobs", () => {
    expect(
      classificarStack("Estágio em Administração: atendimento e recepção."),
    ).toEqual([]);
  });
});
