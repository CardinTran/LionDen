import { afterEach, describe, expect, it } from "vitest";

import { buildLionImageReply } from "../src/bot/messages/lions/image-reply.js";
import { getLionImageUrl } from "../src/features/lions/lion-image-url.js";

const originalPublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

afterEach(() => {
  if (originalPublicBaseUrl === undefined) {
    delete process.env.R2_PUBLIC_BASE_URL;
    return;
  }

  process.env.R2_PUBLIC_BASE_URL = originalPublicBaseUrl;
});

describe("lion image URLs", () => {
  it("returns null when the public base URL is missing", () => {
    delete process.env.R2_PUBLIC_BASE_URL;

    expect(getLionImageUrl("lions/common/example.jpg")).toBeNull();
  });

  it("joins a public base URL with a trailing slash", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://images.example.com/";

    expect(getLionImageUrl("lions/common/example.jpg")).toBe(
      "https://images.example.com/lions/common/example.jpg"
    );
  });

  it("joins an image path with a leading slash", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://images.example.com";

    expect(getLionImageUrl("/lions/common/example.jpg")).toBe(
      "https://images.example.com/lions/common/example.jpg"
    );
  });

  it("joins a normal image path", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://images.example.com";

    expect(getLionImageUrl("lions/common/example.jpg")).toBe(
      "https://images.example.com/lions/common/example.jpg"
    );
  });

  it("keeps text-only replies when the public base URL is missing", () => {
    delete process.env.R2_PUBLIC_BASE_URL;

    expect(
      buildLionImageReply("Lion details", "lions/common/example.jpg")
    ).toBe("Lion details");
  });

  it("adds an image embed when the public base URL is configured", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://images.example.com";

    const reply = buildLionImageReply(
      "Lion details",
      "lions/common/example.jpg"
    );

    expect(reply).not.toBe("Lion details");
    expect(reply).toMatchObject({
      content: "Lion details",
      embeds: [
        {
          data: {
            image: {
              url: "https://images.example.com/lions/common/example.jpg"
            }
          }
        }
      ]
    });
  });
});
