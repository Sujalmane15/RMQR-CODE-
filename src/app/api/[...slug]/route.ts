import { NextRequest, NextResponse } from "next/server";
import { handleApiRequest } from "@/server/api-handler";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((val, key) => {
    query[key] = val;
  });

  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key] = val;
  });

  const res = await handleApiRequest({
    method: "GET",
    path,
    query,
    headers,
  });

  return NextResponse.json(
    res.data !== undefined ? res.data : { error: res.error },
    { status: res.status }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Empty body
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key] = val;
  });

  const res = await handleApiRequest({
    method: "POST",
    path,
    body,
    headers,
  });

  return NextResponse.json(
    res.data !== undefined ? res.data : { error: res.error },
    { status: res.status }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Empty body
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key] = val;
  });

  const res = await handleApiRequest({
    method: "PUT",
    path,
    body,
    headers,
  });

  return NextResponse.json(
    res.data !== undefined ? res.data : { error: res.error },
    { status: res.status }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  const headers: Record<string, string> = {};
  request.headers.forEach((val, key) => {
    headers[key] = val;
  });

  const res = await handleApiRequest({
    method: "DELETE",
    path,
    headers,
  });

  return NextResponse.json(
    res.data !== undefined ? res.data : { error: res.error },
    { status: res.status }
  );
}
