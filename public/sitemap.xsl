<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap - Daily Meal Recipe</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background-color: #0b0f19;
            margin: 0;
            padding: 40px 20px;
          }
          .container {
            max-width: 1000px;
            margin: 0 auto;
            background: #111827;
            padding: 40px;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .title-area h1 {
            font-size: 28px;
            color: #ffffff;
            margin: 0 0 8px 0;
            font-weight: 700;
          }
          .title-area p {
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
          }
          .title-area p a {
            color: #fbbf24;
            text-decoration: none;
            font-weight: 600;
          }
          .title-area p a:hover {
            text-decoration: underline;
          }
          .stats {
            background: rgba(251, 191, 36, 0.1);
            border: 1px solid rgba(251, 191, 36, 0.2);
            color: #fbbf24;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin-top: 10px;
          }
          th {
            background-color: rgba(255, 255, 255, 0.02);
            color: #94a3b8;
            text-align: left;
            padding: 16px;
            font-weight: 600;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }
          td {
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            word-break: break-all;
            color: #e2e8f0;
          }
          tr:hover td {
            background-color: rgba(255, 255, 255, 0.01);
          }
          .priority-high {
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
          }
          .priority-med {
            color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
          }
          .priority-low {
            color: #94a3b8;
            background: rgba(148, 163, 184, 0.1);
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
          }
          .url-link {
            color: #fbbf24;
            text-decoration: none;
            transition: color 0.15s ease;
          }
          .url-link:hover {
            color: #ffffff;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title-area">
              <h1>XML Sitemap</h1>
              <p>
                Generated for search engines like Google and Bing. Learn more about XML sitemaps on <a href="https://sitemaps.org" target="_blank">sitemaps.org</a>.
              </p>
            </div>
            <div class="stats">
              Total URLs: <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 60%">URL</th>
                <th style="width: 20%">Priority</th>
                <th style="width: 20%">Change Frequency</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td>
                    <a class="url-link" href="{sitemap:loc}">
                      <xsl:value-of select="sitemap:loc"/>
                    </a>
                  </td>
                  <td>
                    <span>
                      <xsl:attribute name="class">
                        <xsl:choose>
                          <xsl:when test="number(sitemap:priority) &gt;= 0.8">priority-high</xsl:when>
                          <xsl:when test="number(sitemap:priority) &gt;= 0.5">priority-med</xsl:when>
                          <xsl:otherwise>priority-low</xsl:otherwise>
                        </xsl:choose>
                      </xsl:attribute>
                      <xsl:value-of select="sitemap:priority"/>
                    </span>
                  </td>
                  <td style="text-transform: capitalize; color: #94a3b8;">
                    <xsl:value-of select="sitemap:changefreq"/>
                  </td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
