import { describe, expect, it } from "vitest";
import { bsOptions, configSource, normalizeApiBase, readSettings, PACKAGE_PATH, ROKU_DIR } from "./roku.ts";

describe("normalizeApiBase", () => {
  it("accepts a plain origin and drops a trailing slash", () => {
    expect(normalizeApiBase(" http://192.168.68.59:8080/ ")).toBe("http://192.168.68.59:8080");
    expect(normalizeApiBase("https://multistream.example.com")).toBe("https://multistream.example.com");
  });

  it.each(["192.168.68.59:8080", "http://pi:8080/api", 'http://pi"; evil', "ftp://pi", ""])("rejects %s", (raw) => {
    expect(() => normalizeApiBase(raw)).toThrow(/ROKU_API_BASE/);
  });
});

describe("configSource", () => {
  it("generates an AppConfig function with the server address", () => {
    const source = configSource("http://192.168.68.59:8080/");
    expect(source).toContain("function AppConfig() as object");
    expect(source).toContain('return { apiBase: "http://192.168.68.59:8080" }');
  });
});

describe("readSettings", () => {
  const full = { ROKU_API_BASE: "http://192.168.68.59:8080", ROKU_HOST: "192.168.68.20", ROKU_DEV_PASSWORD: "pw" };

  it("needs only the server address to build", () => {
    expect(readSettings("build", { ROKU_API_BASE: "http://192.168.68.59:8080/" })).toEqual({
      apiBase: "http://192.168.68.59:8080",
      host: undefined,
      password: undefined,
    });
  });

  it("needs the TV and its developer password to deploy", () => {
    expect(readSettings("deploy", full)).toEqual({
      apiBase: "http://192.168.68.59:8080",
      host: "192.168.68.20",
      password: "pw",
    });
    expect(() => readSettings("deploy", { ROKU_API_BASE: full.ROKU_API_BASE })).toThrow(/ROKU_HOST[\s\S]*ROKU_DEV_PASSWORD/);
  });

  it("explains a missing server address", () => {
    expect(() => readSettings("build", {})).toThrow(/ROKU_API_BASE is missing/);
  });

  it("checks the code without any settings", () => {
    expect(readSettings("check", {}).apiBase).toBe("http://127.0.0.1:8080");
  });
});

describe("bsOptions", () => {
  const settings = { apiBase: "http://192.168.68.59:8080", host: "192.168.68.20", password: "pw" };

  it("only validates for check", () => {
    expect(bsOptions("check", settings, "/tmp/c.brs")).toMatchObject({
      rootDir: ROKU_DIR,
      createPackage: false,
      copyToStaging: false,
      deploy: false,
    });
  });

  it("packages for build and installs for deploy", () => {
    expect(bsOptions("build", settings, "/tmp/c.brs")).toMatchObject({ createPackage: true, deploy: false, outFile: PACKAGE_PATH });
    expect(bsOptions("deploy", settings, "/tmp/c.brs")).toMatchObject({ deploy: true, host: "192.168.68.20", password: "pw" });
  });

  it("adds the generated config file and leaves the tests out of the app", () => {
    const files = bsOptions("build", settings, "/tmp/c.brs").files!;
    expect(files).toContainEqual({ src: "/tmp/c.brs", dest: "source/generated/config.brs" });
    expect(files.some((f) => typeof f === "string" && f.startsWith("tests"))).toBe(false);
  });
});
