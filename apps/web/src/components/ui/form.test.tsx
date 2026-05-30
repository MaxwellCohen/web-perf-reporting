import { act, fireEvent, render } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "@/components/ui/form";

function ExampleForm() {
  const form = useForm<{ email: string }>({
    defaultValues: { email: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(() => {})}>
        <FormField
          control={form.control}
          name="email"
          rules={{ required: "Email is required" }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormDescription>We only use this to send alerts.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <button type="submit">Submit</button>
      </form>
    </Form>
  );
}

function InvalidHookUsage() {
  useFormField();
  return null;
}

describe("ui/form", () => {
  it("wires form labels, descriptions, and error messages together", async () => {
    const { container } = render(<ExampleForm />);

    const input = container.querySelector('input[placeholder="name@example.com"]');
    expect(container.textContent).toContain("We only use this to send alerts.");
    expect(input).toHaveAttribute("aria-invalid", "false");

    const submitBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Submit",
    );
    fireEvent.click(submitBtn!);

    await act(async () => {});

    expect(container.textContent).toContain("Email is required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input!.getAttribute("aria-describedby")).toContain("description");
    expect(input!.getAttribute("aria-describedby")).toContain("message");
  });

  it("throws when useFormField is used outside a form field context", () => {
    expect(() => render(<InvalidHookUsage />)).toThrow();
  });
});
