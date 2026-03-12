import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { getLatestArticle, type LatestArticle } from "./getLatestArticle";

test("getLatestArticle returns the latest article from the delegate", async () => {
  const article = {
    id: "article-1",
    slug: "fresh-loaf",
    title: "Fresh Loaf",
    author: null,
    reviewProfile: null,
    commerceModules: [],
  } as unknown as LatestArticle;

  const result = await getLatestArticle({
    findLatestArticle: async () => article,
  });

  assert.equal(result, article);
});

test("getLatestArticle returns null when Prisma is unavailable", async () => {
  const result = await getLatestArticle({
    findLatestArticle: async () => {
      throw new Prisma.PrismaClientInitializationError(
        "Can't reach database server at 127.0.0.1:5433",
        "6.18.0",
      );
    },
  });

  assert.equal(result, null);
});

test("getLatestArticle still surfaces unexpected errors", async () => {
  const failure = new Error("unexpected query failure");

  await assert.rejects(
    () =>
      getLatestArticle({
        findLatestArticle: async () => {
          throw failure;
        },
      }),
    failure,
  );
});
