"use client";

import { useEffect, useRef, useState } from "react";

interface FadeInStaggerProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export default function FadeInStagger({
  children,
  delay = 300,
  duration = 800,
  className = "",
}: FadeInStaggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "50px",
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <div ref={containerRef} className={className}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={`transition-all ease-out ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
          style={{
            transitionDuration: `${duration}ms`,
            transitionDelay: isVisible ? `${index * delay}ms` : "0ms",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
