"use client";

import { type FormEvent, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

function FormattedChatMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mt-3 first:mt-0 text-lg font-semibold leading-7">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-3 first:mt-0 text-base font-semibold leading-7">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-3 first:mt-0 text-sm font-semibold uppercase text-foreground/80">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-3 first:mt-0 text-sm font-semibold">{children}</h4>
        ),
        h5: ({ children }) => (
          <h5 className="mt-3 first:mt-0 text-sm font-semibold">{children}</h5>
        ),
        h6: ({ children }) => (
          <h6 className="mt-3 first:mt-0 text-xs font-semibold uppercase text-foreground/70">
            {children}
          </h6>
        ),
        p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5 marker:font-semibold">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="pl-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-foreground/25 pl-3 text-foreground/75">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children }) => (
          <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="my-2 overflow-x-auto rounded bg-foreground/10 p-3 text-xs leading-5">
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-foreground/15 bg-foreground/5 px-2 py-1 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-foreground/15 px-2 py-1">{children}</td>
        ),
        hr: () => <hr className="my-3 border-foreground/15" />,
      }}
    >
      {content}
    </ReactMarkdown>
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
