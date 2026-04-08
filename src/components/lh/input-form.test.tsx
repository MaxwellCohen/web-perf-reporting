import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAlert,
  getButton,
  getTab,
  submitForm,
} from "./__mocks__/input-form-mocks";
import { executeSubmit } from "@/components/lh/input-form-action";
import { LhInputForm } from "@/components/lh/LhInputForm";

const lhFormMocks = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./__mocks__/input-form-mocks") as typeof import("./__mocks__/input-form-mocks");
});

vi.mock("@/components/lh/input-form-action", () => ({
  executeSubmit: vi.fn().mockResolvedValue({ error: null, success: false }),
}));

vi.mock("@/components/ui/tabs", () => lhFormMocks.tabsMock);
vi.mock("lucide-react", () => lhFormMocks.lucideMock);
vi.mock("@/components/ui/card", () => lhFormMocks.cardMock);
vi.mock("@/components/ui/input", () => lhFormMocks.inputMock);
vi.mock("@/components/ui/textarea", () => lhFormMocks.textareaMock);
vi.mock("@/components/ui/button", () => lhFormMocks.buttonMock);
vi.mock("@/components/ui/label", () => lhFormMocks.labelMock);
vi.mock("@/components/ui/alert", () => lhFormMocks.alertMock);
vi.mock("@/components/lh/inputs/LhTabList", () => lhFormMocks.lhTabListMock);
vi.mock("@/components/lh/inputs/LhTextInput", () => lhFormMocks.lhTextInputMock);
vi.mock("@/components/lh/inputs/LhFileInput", () => lhFormMocks.lhFileInputMock);
vi.mock("@/components/lh/inputs/LhUrlInput", () => lhFormMocks.lhUrlInputMock);

async function switchToUrlTab(container: HTMLElement) {
  const urlTab = getTab(container, /Fetch via PageSpeed Insights API/);
  await act(async () => {
    fireEvent.click(urlTab!);
  });
}

describe("LhInputForm", () => {
  describe("form action wiring", () => {
    it("form has id lh-input-form", () => {
      const { container } = render(<LhInputForm />);
      const form = container.querySelector("#lh-input-form");
      expect(form).toBeInTheDocument();
    });

    it("submit button is associated with form via form attribute", () => {
      const { container } = render(<LhInputForm />);
      const button = container.querySelector('button[type="submit"]');
      expect(button).toHaveAttribute("form", "lh-input-form");
    });

    it("submit button shows Submit when not pending", () => {
      const { container } = render(<LhInputForm />);
      const button = container.querySelector('button[type="submit"]');
      expect(button).toHaveTextContent("Submit");
    });
  });

  it("renders card with title, description, tabs and submit button", () => {
    const { container } = render(<LhInputForm />);
    expect(container.textContent).toContain("Lighthouse Report Viewer");
    expect(container.textContent).toContain("View your Lighthouse Report");
    expect(container.querySelector('[role="tablist"]')).toBeTruthy();
    expect(container.querySelector('button[type="submit"]')).toHaveTextContent("Submit");
  });

  it("shows JSON Entries section and add-entry button on text tab", () => {
    const { container } = render(<LhInputForm />);
    expect(container.textContent).toContain("JSON Entries");
    expect(getButton(container, "Add Another JSON Entry")).toBeTruthy();
  });

  describe("text tab submit validation", () => {
    it("displays error from form action", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: "All JSON entries must have a name",
        success: false,
      });
      const { container } = render(<LhInputForm />);
      fireEvent.change(container.querySelector('input[id^="json-name"]')!, {
        target: { value: "  " },
      });
      submitForm();
      await act(async () => {});

      expect(getAlert(container)).toHaveTextContent("All JSON entries must have a name");
    });

    it("displays success from form action", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: null,
        success: true,
      });
      const { container } = render(<LhInputForm />);
      fireEvent.change(container.querySelector('input[id^="json-name"]')!, {
        target: { value: "Report1" },
      });
      const contentArea = container.querySelector(
        'textarea[placeholder*="Paste"]',
      ) as HTMLTextAreaElement;
      fireEvent.change(contentArea, { target: { value: '{"score": 90}' } });
      submitForm();
      await act(async () => {});

      expect(getAlert(container)).toHaveTextContent("Success");
      expect(container.textContent).toMatch(/JSON data has been successfully processed/);
    });
  });

  describe("text tab interactions", () => {
    it("adds another JSON entry", () => {
      const { container } = render(<LhInputForm />);

      fireEvent.click(getButton(container, "Add Another JSON Entry")!);

      const nameInputs = container.querySelectorAll('input[placeholder="Entry name"]');
      expect(nameInputs).toHaveLength(2);
    });

    it("updates name and content and can remove entry", () => {
      const { container } = render(<LhInputForm />);

      fireEvent.change(container.querySelector('input[placeholder="Entry name"]')!, {
        target: { value: "First" },
      });
      const contentAreas = container.querySelectorAll('textarea[placeholder*="Paste"]');
      fireEvent.change(contentAreas[0] as HTMLTextAreaElement, {
        target: { value: "{}" },
      });

      expect(
        (container.querySelector('input[placeholder="Entry name"]') as HTMLInputElement).value,
      ).toBe("First");
      expect((contentAreas[0] as HTMLTextAreaElement).value).toBe("{}");

      fireEvent.click(getButton(container, "Remove")!);
      expect(container.querySelectorAll('input[placeholder="Entry name"]')).toHaveLength(1);
    });
  });

  describe("file tab", () => {
    beforeEach(() => {
      vi.mocked(executeSubmit).mockReset();
      vi.mocked(executeSubmit).mockResolvedValue({
        error: null,
        success: false,
      });
    });

    it("shows error when submitting with no files selected", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: "Please select at least one JSON file",
        success: false,
      });
      const { container } = render(<LhInputForm />);
      const fileTab = getTab(container, /Upload Lighthouse JSON File/);
      await act(async () => {
        fireEvent.click(fileTab!);
      });
      submitForm();
      await waitFor(() => {
        expect(getAlert(container)).toHaveTextContent("Please select at least one JSON file");
      });
    });

    it("shows success when file has valid JSON and name", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: null,
        success: true,
      });
      const { container } = render(<LhInputForm />);
      const fileTab = getTab(container, /Upload Lighthouse JSON File/);
      await act(async () => {
        fireEvent.click(fileTab!);
      });
      const file = new File(['{"score": 85}'], "report.json", {
        type: "application/json",
      });
      fireEvent.change(container.querySelector("#json-file")!, {
        target: { files: [file] },
      });
      fireEvent.change(container.querySelector('input[placeholder="Enter a name for this file"]')!, {
        target: { value: "MyFile" },
      });
      submitForm();
      await waitFor(() => {
        expect(getAlert(container)).toHaveTextContent("Success");
      });
    });

    it("ignores file input change when no files selected", async () => {
      const { container } = render(<LhInputForm />);
      const fileTab = getTab(container, /Upload Lighthouse JSON File/);
      await act(async () => {
        fireEvent.click(fileTab!);
      });
      fireEvent.change(container.querySelector("#json-file")!, {
        target: { files: [] },
      });
      expect(getTab(container, /Upload Lighthouse JSON File/)).toHaveAttribute(
        "data-state",
        "active",
      );
      expect(container.querySelector('input[placeholder="Enter a name for this file"]')).toBeNull();
    });

    it("allows updating file name and removing file", async () => {
      const { container } = render(<LhInputForm />);
      const fileTab = getTab(container, /Upload Lighthouse JSON File/);
      await act(async () => {
        fireEvent.click(fileTab!);
      });
      const file = new File(["{}"], "a.json", { type: "application/json" });
      fireEvent.change(container.querySelector("#json-file")!, {
        target: { files: [file] },
      });
      const nameInput = container.querySelector(
        'input[placeholder="Enter a name for this file"]',
      ) as HTMLInputElement;
      fireEvent.change(nameInput!, { target: { value: "CustomName" } });
      expect(nameInput).toHaveValue("CustomName");
      const removeButtons = Array.from(container.querySelectorAll("button")).filter(
        (b) => b.textContent?.trim() === "Remove",
      );
      fireEvent.click(removeButtons[removeButtons.length - 1]!);
      await act(async () => {});
      expect(container.querySelector('input[placeholder="Enter a name for this file"]')).toBeNull();
    });
  });

  describe("url tab", () => {
    beforeEach(() => {
      vi.mocked(executeSubmit).mockReset();
      vi.mocked(executeSubmit).mockResolvedValue({
        error: null,
        success: false,
      });
    });

    it("shows error when URL is empty", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({
        error: "Please enter a URL",
        success: false,
      });
      const { container } = render(<LhInputForm />);
      await switchToUrlTab(container);
      submitForm();
      await waitFor(() => {
        expect(getAlert(container)).toHaveTextContent("Please enter a URL");
      });
    });

    it("shows success when URL returns valid JSON", async () => {
      vi.mocked(executeSubmit).mockResolvedValueOnce({ error: null, success: true });
      const { container } = render(<LhInputForm />);
      await switchToUrlTab(container);
      fireEvent.change(container.querySelector("#json-url")!, {
        target: { value: "https://api.example.com/data.json" },
      });
      submitForm();
      await waitFor(() => {
        expect(getAlert(container)).toHaveTextContent("Success");
      });
      expect(executeSubmit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ jsonUrl: "https://api.example.com/data.json" }),
        expect.any(Function),
      );
    });

    it("shows Processing and disables button during async submission", async () => {
      let resolveAction: () => void;
      const actionPromise = new Promise<{ error: null; success: boolean }>((resolve) => {
        resolveAction = () => resolve({ error: null, success: true });
      });
      vi.mocked(executeSubmit).mockReturnValue(actionPromise);
      const { container } = render(<LhInputForm />);
      await switchToUrlTab(container);
      fireEvent.change(container.querySelector("#json-url")!, {
        target: { value: "https://example.com/data.json" },
      });
      submitForm();
      await act(async () => {});
      const button = container.querySelector('button[type="submit"]');
      expect(button).toHaveTextContent("Processing...");
      expect(button).toBeDisabled();
      resolveAction!();
      await act(async () => {});
      expect(button).toHaveTextContent("Submit");
      expect(button).not.toBeDisabled();
    });

    it("updates URL input when typing in url tab", async () => {
      const { container } = render(<LhInputForm />);
      await switchToUrlTab(container);
      const urlInput = container.querySelector("#json-url") as HTMLInputElement;
      fireEvent.change(urlInput, { target: { value: "https://test.com" } });
      expect(urlInput).toHaveValue("https://test.com");
    });
  });
});
