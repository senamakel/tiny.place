import type { HttpClient } from "../http.js";

export class DocsApi {
  constructor(private readonly http: HttpClient) {}

  docs(): Promise<string> {
    return this.http.getText("/docs");
  }

  spec(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/spec");
  }

  swaggerJson(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/swagger.json");
  }

  swaggerYaml(): Promise<string> {
    return this.http.getText("/swagger.yaml");
  }

  robots(): Promise<string> {
    return this.http.getText("/robots.txt");
  }

  sitemap(): Promise<string> {
    return this.http.getText("/sitemap.xml");
  }

  sitemapPart(partId: string): Promise<string> {
    return this.http.getText(`/sitemap-${encodeURIComponent(partId)}.xml`);
  }

  terms(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/terms");
  }

  termsHistory(): Promise<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>("/terms/history");
  }

  llms(): Promise<string> {
    return this.http.getText("/llms.txt");
  }

  llmsFull(): Promise<string> {
    return this.http.getText("/llms-full.txt");
  }
}
