"use client";

import { type FormEvent, type ReactNode, useState } from "react";
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

type FormattedTextBlock =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "ordered-list" | "unordered-list";
      items: string[];
    };

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+?\*\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    return <span key={key}>{part}</span>;
  });
}

function getFormattedTextBlocks(content: string): FormattedTextBlock[] {
  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+(?=\d{1,2}\.\s+\*\*)/g, "\n")
    .replace(/[ \t]+(?=[-*]\s+\*\*)/g, "\n")
    .trim();
  const lines = normalizedContent
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks: FormattedTextBlock[] = [];

  for (const line of lines) {
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const lastBlock = blocks.at(-1);
      if (lastBlock?.type === "ordered-list") {
        lastBlock.items.push(orderedMatch[1]);
      } else {
        blocks.push({ type: "ordered-list", items: [orderedMatch[1]] });
      }
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      const lastBlock = blocks.at(-1);
      if (lastBlock?.type === "unordered-list") {
        lastBlock.items.push(unorderedMatch[1]);
      } else {
        blocks.push({ type: "unordered-list", items: [unorderedMatch[1]] });
      }
      continue;
    }

    blocks.push({ type: "text", text: line });
  }

  return blocks;
}

function FormattedChatMessage({ content }: { content: string }) {
  const blocks = getFormattedTextBlocks(content);

  return (
    <div className="flex flex-col gap-2 break-words">
      {blocks.map((block, blockIndex) => {
        if (block.type === "ordered-list") {
          return (
            <ol
              key={`ordered-${blockIndex}`}
              className="list-decimal space-y-2 pl-5 marker:font-semibold"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineMarkdown(item, `${blockIndex}-${itemIndex}`)}
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              key={`unordered-${blockIndex}`}
              className="list-disc space-y-2 pl-5"
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${blockIndex}-${itemIndex}`} className="pl-1">
                  {renderInlineMarkdown(item, `${blockIndex}-${itemIndex}`)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "text") {
          return (
            <div key={`text-${blockIndex}`}>
              {renderInlineMarkdown(block.text, `${blockIndex}`)}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
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
  const [isOpen, setIsOpen] = useState(false);

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
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {isOpen && (
        <section className="w-[min(24rem,calc(100vw-2rem))] border border-foreground/20 bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b border-foreground/15 px-4 py-3">
            <h2 className="text-lg font-semibold font-coustard">Menu Chat</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded px-2 py-1 text-xl leading-none text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
              aria-label="Close menu chat"
            >
              x
            </button>
          </div>

          <div className="max-h-[22rem] min-h-32 overflow-y-auto bg-foreground/[0.02] p-4">
            {messages.length === 0 ? (
              <div className="text-sm text-foreground/50">No messages yet.</div>
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
                    {message.role === "assistant" ? (
                      <FormattedChatMessage content={message.content} />
                    ) : (
                      <span className="whitespace-pre-wrap">{message.content}</span>
                    )}
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
            <div className="mx-4 mt-3 border border-red-400 bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submitMessage} className="flex gap-2 p-4">
            <label className="flex-1">
              <span className="sr-only">Ask about this menu</span>
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about this menu..."
                className="w-full rounded border-2 border-foreground/20 bg-background px-3 py-2 text-sm font-coustard text-foreground shadow-sm transition-colors placeholder:text-foreground/50 hover:border-foreground/40 focus:border-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded bg-foreground px-4 py-2 text-sm font-coustard text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="rounded-full bg-foreground px-5 py-3 font-coustard text-sm text-background shadow-xl transition-transform hover:scale-[1.02] hover:opacity-90"
        aria-expanded={isOpen}
      >
        Menu Chat
      </button>
    </div>
  );
}
