import { describe, expect, it } from "vitest";

import {
  classSlug,
  extractIdFromSlugParam,
  getDosenClassMembersPath,
  getDosenClassPath,
  getDosenClassReportsPath,
  getDosenClassSettingsPath,
  moduleSlug,
  slugifyTitle,
} from "./urls";

describe("class URL helpers", () => {
  it("creates readable slugs from class and module titles", () => {
    expect(slugifyTitle("Pemrograman Web Dasar")).toBe("pemrograman-web-dasar");
    expect(
      classSlug({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        title: "Pemrograman Web Dasar",
      }),
    ).toBe("pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(
      moduleSlug({
        id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
        title: "Pengenalan HTML dan CSS",
      }),
    ).toBe("pengenalan-html-dan-css-cccccccc-cccc-4ccc-8ccc-ccccccccccc1");
  });

  it("extracts UUIDs from pretty route params", () => {
    expect(
      extractIdFromSlugParam("pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"),
    ).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
  });

  it("builds the canonical dosen class path", () => {
    const classItem = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      title: "Pemrograman Web Dasar",
    };

    expect(
      getDosenClassPath(classItem),
    ).toBe("/dosen/classes/pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1");
    expect(getDosenClassMembersPath(classItem)).toBe(
      "/dosen/classes/pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/members",
    );
    expect(getDosenClassReportsPath(classItem)).toBe(
      "/dosen/classes/pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/reports",
    );
    expect(getDosenClassSettingsPath(classItem)).toBe(
      "/dosen/classes/pemrograman-web-dasar-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/settings",
    );
  });
});
