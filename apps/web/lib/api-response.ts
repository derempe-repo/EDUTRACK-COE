import { NextResponse } from "next/server";

type ApiSuccess<T> = {
  data: T;
  message?: string;
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

export function apiSuccess<T>(data: T, init?: ResponseInit & { message?: string }) {
  const { message, ...responseInit } = init ?? {};

  return NextResponse.json<ApiSuccess<T>>(
    {
      data,
      ...(message ? { message } : {}),
    },
    responseInit,
  );
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json<ApiError>(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}
