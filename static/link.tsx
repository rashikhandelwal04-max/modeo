"use client";
import { toHash } from "./navigation";
export default function Link({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={toHash(href)} {...rest} onClick={(e) => { rest.onClick?.(e); window.scrollTo(0, 0); }}>{children}</a>;
}
