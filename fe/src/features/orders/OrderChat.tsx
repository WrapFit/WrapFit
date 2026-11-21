"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messageNeedsWarning, ORDER_MESSAGE_MAX_LENGTH } from "@wrapfit/shared";
import { AlertTriangle, MessageCircle, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { listOrderMessages, postOrderMessage } from "@/api/orders";
import { Button } from "@/components/ui";
import { errorMessage } from "@/services/api";
import type { OrderMessage } from "@/types/api";
import { cn } from "@/utils/helpers";

/** Messages refresh this often while the conversation is open. */
const REFRESH_MS = 15_000;

const chatKey = (orderId: string) => ["orders", orderId, "messages"] as const;

/**
 * The conversation of an order (docs/19 G.4, BR-G17): the official channel between the customer, the shop and WrapFit.
 * Before the shop took the order, a phone or account number gets a warning (BR-G19): it is sent, and WrapFit sees it.
 */
export function OrderChat({
  orderId,
  accepted,
  closed = false,
  placeholder = "Nhắn cho xưởng về đơn này…",
  className,
}: {
  orderId: string;
  /** The shop took the order: contact details are fine from now on. */
  accepted: boolean;
  /** The conversation no longer takes messages. */
  closed?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [serverWarning, setServerWarning] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = useQuery({ queryKey: chatKey(orderId), queryFn: () => listOrderMessages(orderId), refetchInterval: REFRESH_MS });

  const send = useMutation({
    mutationFn: () => postOrderMessage(orderId, text.trim()),
    onSuccess: ({ message, warning }) => {
      setText("");
      setServerWarning(warning);
      queryClient.setQueryData<OrderMessage[]>(chatKey(orderId), (list) => [...(list ?? []), message]);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const count = messages.data?.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  const hint = !accepted && text.trim() !== "" && messageNeedsWarning(text);

  return (
    <section aria-label="Tin nhắn trong đơn" className={cn("flex flex-col gap-3", className)}>
      <div className="flex max-h-80 min-h-32 flex-col gap-2 overflow-y-auto rounded-xl border border-library-line bg-library-tile/40 p-3">
        {messages.isPending ? (
          <p className="m-auto text-caption text-library-muted">Đang tải tin nhắn…</p>
        ) : messages.isError ? (
          <p className="m-auto text-caption text-danger-fg">Chưa tải được tin nhắn: {errorMessage(messages.error)}</p>
        ) : count === 0 ? (
          <p className="m-auto flex items-center gap-2 text-caption text-library-muted">
            <MessageCircle className="size-4" aria-hidden /> Chưa có tin nhắn. Mọi trao đổi về đơn nên ở đây để WrapFit hỗ trợ khi cần.
          </p>
        ) : (
          messages.data!.map((message) => <Bubble key={message.id} message={message} />)
        )}
        <div ref={bottom} />
      </div>

      {closed ? (
        <p className="text-caption text-library-muted">Đơn đã đóng quá 30 ngày: liên hệ WrapFit nếu cần hỗ trợ.</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim() && !send.isPending) send.mutate();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor={`chat-${orderId}`}>
              Tin nhắn
            </label>
            <textarea
              id={`chat-${orderId}`}
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, ORDER_MESSAGE_MAX_LENGTH))}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (text.trim() && !send.isPending) send.mutate();
                }
              }}
              rows={2}
              placeholder={placeholder}
              className="min-h-11 flex-1 resize-none rounded-xl border border-library-line bg-white px-3 py-2 text-sm text-library-ink outline-none focus-visible:ring-[3px] focus-visible:ring-focus/40"
            />
            <Button type="submit" size="sm" variant="brand" disabled={!text.trim() || send.isPending} aria-label="Gửi tin nhắn">
              <Send className="size-4" aria-hidden />
            </Button>
          </div>
          {(hint || serverWarning) && (
            <p role="note" className="flex items-start gap-1.5 text-caption text-warning-fg">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Xưởng chưa nhận đơn: hãy trao đổi trong đơn thay vì gửi số điện thoại hay số tài khoản, để WrapFit bảo vệ được giao dịch của bạn.
            </p>
          )}
          {send.isError && <p className="text-caption text-danger-fg">{errorMessage(send.error)}</p>}
        </form>
      )}
    </section>
  );
}

function Bubble({ message }: { message: OrderMessage }) {
  if (message.authorRole === "SYSTEM") {
    return <p className="mx-auto max-w-[90%] rounded-full bg-white px-3 py-1 text-center text-caption text-library-muted">{message.body}</p>;
  }
  const at = new Date(message.createdAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
  return (
    <div className={cn("flex max-w-[85%] flex-col gap-0.5", message.mine ? "self-end items-end" : "self-start items-start")}>
      <span className="text-caption text-library-muted">
        {message.mine ? "Bạn" : message.authorName} · {at}
      </span>
      <p
        className={cn(
          "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
          message.mine ? "bg-library-ink text-white" : message.authorRole === "ADMIN" ? "bg-fpt-orange-light text-library-ink" : "bg-white text-library-ink ring-1 ring-library-line"
        )}
      >
        {message.body}
      </p>
      {message.flagged && (
        <span className="flex items-center gap-1 text-caption text-warning-fg">
          <AlertTriangle className="size-3" aria-hidden /> Có số điện thoại / số tài khoản trước khi xưởng nhận đơn
        </span>
      )}
    </div>
  );
}
