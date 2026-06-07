"use client";

import { FormEvent, useState } from "react";
import { MenuItem } from "./MacronutrientTable";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface MenuChatProps {
  restaurantName: string;
  menuItems: MenuItem[];
  usesAiEstimates?: boolean;
}

export default function MenuChat({
  restaurantName,
  menuItems,
  usesAiEstimates = false,
}: MenuChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const question = input.trim();
    if (!question || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/menu-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restaurantName,
          menuItems,
          usesAiEstimates,
          messages: nextMessages.slice(-8),
        }),
      });

      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Menu chat is unavailable.");
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.answer ?? "I could not answer that from this menu.",
        },
      ]);
    } catch (chatError) {
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Menu chat is unavailable."
      );
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mb-8 border-y border-foreground/15 py-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold font-coustard">Menu Chat</h2>
        <p className="text-sm text-foreground/60">
          Answers use the extracted menu data shown on this page.
        </p>
      </div>

      <div className="mt-4 min-h-28 border border-foreground/20 bg-foreground/[0.02] p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-foreground/50">
            Ask for comparisons, macro-friendly picks, or details about a dish.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-foreground text-background"
                    : "mr-auto border border-foreground/15 bg-background text-foreground"
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto border border-foreground/15 bg-background px-3 py-2 text-sm text-foreground/60">
                Thinking...
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={submitMessage} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Ask about this menu</span>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about calories, protein, carbs, or fat..."
            className="w-full rounded border-2 border-foreground/20 bg-background px-4 py-3 font-coustard text-foreground shadow-sm transition-colors placeholder:text-foreground/50 hover:border-foreground/40 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-foreground px-5 py-3 font-coustard text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </section>
  );
}
