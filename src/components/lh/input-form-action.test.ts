import { describe, expect, it, vi } from "vitest";
import {
  executeSubmit,
  fetchJsonFromUrl,
  validateJson,
  type FormInputs,
  type FormState,
} from "@/components/lh/input-form-action";

const initialState: FormState = { error: null, success: false };

describe("validateJson", () => {
  it("returns true for valid JSON", () => {
    expect(validateJson("{}")).toBe(true);
    expect(validateJson('{"a":1}')).toBe(true);
    expect(validateJson("[]")).toBe(true);
    expect(validateJson('"string"')).toBe(true);
  });

  it("returns false for invalid JSON", () => {
    expect(validateJson("")).toBe(false);
    expect(validateJson("not json")).toBe(false);
    expect(validateJson("{")).toBe(false);
    expect(validateJson('{"a":')).toBe(false);
  });
});

describe("fetchJsonFromUrl", () => {
  it("returns JSON text when fetch succeeds", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"score": 90}'),
    });
    const result = await fetchJsonFromUrl("https://example.com/data.json", mockFetch);
    expect(result).toBe('{"score": 90}');
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/data.json");
  });

  it("throws when response is not ok", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Not Found",
    });
    await expect(fetchJsonFromUrl("https://example.com/data.json", mockFetch)).rejects.toThrow(
      "Failed to fetch JSON from URL: Not Found",
    );
  });

  it("throws when response is not valid JSON", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("not json"),
    });
    await expect(fetchJsonFromUrl("https://example.com/data.json", mockFetch)).rejects.toThrow(
      "URL did not return valid JSON",
    );
  });
});

describe("executeSubmit", () => {
  describe("text tab", () => {
    it("returns success for valid JSON input", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [{ name: "Report1", content: '{"score": 90}' }],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({ error: null, success: true });
    });

    it("returns error when no entries", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: "Please add at least one JSON entry",
        success: false,
      });
    });

    it("returns error when name is empty", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [{ name: "  ", content: "{}" }],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: "All JSON entries must have a name",
        success: false,
      });
    });

    it("returns error when content is empty", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [{ name: "My Report", content: "" }],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: 'JSON content for "My Report" is empty',
        success: false,
      });
    });

    it("returns error when content is invalid JSON", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [{ name: "My Report", content: "not valid {" }],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: 'Invalid JSON format for "My Report"',
        success: false,
      });
    });

    it("returns success for multiple valid entries", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [
          { name: "A", content: "{}" },
          { name: "B", content: '{"x":1}' },
        ],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "text",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({ error: null, success: true });
    });
  });

  describe("file tab", () => {
    it("returns success for valid JSON file", async () => {
      const file = new File(['{"a":1}'], "report.json", {
        type: "application/json",
      });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [{ name: "MyFile", file }],
        jsonUrl: "",
        activeTab: "file",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({ error: null, success: true });
    });

    it("returns error when no files selected", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "file",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: "Please select at least one JSON file",
        success: false,
      });
    });

    it("returns error when file has no name", async () => {
      const file = new File(["{}"], "a.json", { type: "application/json" });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [{ name: "  ", file }],
        jsonUrl: "",
        activeTab: "file",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: "All files must have a name",
        success: false,
      });
    });

    it("returns error when file content is invalid JSON", async () => {
      const file = new File(["not json"], "report.json", {
        type: "application/json",
      });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [{ name: "MyFile", file }],
        jsonUrl: "",
        activeTab: "file",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: 'File "report.json" does not contain valid JSON',
        success: false,
      });
    });
  });

  describe("url tab", () => {
    it("returns success when URL returns valid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('{"lighthouse": true}'),
      });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "https://api.example.com/data.json",
        activeTab: "url",
      };
      const result = await executeSubmit(
        initialState,
        formInputs,
        mockFetch as unknown as typeof fetch,
      );
      expect(result).toEqual({ error: null, success: true });
      expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/data.json");
    });

    it("returns error when URL is empty", async () => {
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "",
        activeTab: "url",
      };
      const result = await executeSubmit(initialState, formInputs);
      expect(result).toEqual({
        error: "Please enter a URL",
        success: false,
      });
    });

    it("returns error when fetch fails", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "https://example.com/data.json",
        activeTab: "url",
      };
      const result = await executeSubmit(
        initialState,
        formInputs,
        mockFetch as unknown as typeof fetch,
      );
      expect(result).toEqual({
        error: "Failed to fetch JSON from URL: Not Found",
        success: false,
      });
    });

    it("returns error when URL returns invalid JSON", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("not json"),
      });
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "https://example.com/data.json",
        activeTab: "url",
      };
      const result = await executeSubmit(
        initialState,
        formInputs,
        mockFetch as unknown as typeof fetch,
      );
      expect(result).toEqual({
        error: "URL did not return valid JSON",
        success: false,
      });
    });
  });

  describe("non-Error throws", () => {
    it("returns unknown error for string throws", async () => {
      const mockFetch = vi.fn().mockRejectedValue("string error");
      const formInputs: FormInputs = {
        jsonInputs: [],
        jsonFiles: [],
        jsonUrl: "https://example.com/data.json",
        activeTab: "url",
      };
      const result = await executeSubmit(
        initialState,
        formInputs,
        mockFetch as unknown as typeof fetch,
      );
      expect(result).toEqual({
        error: "An unknown error occurred",
        success: false,
      });
    });
  });
});
