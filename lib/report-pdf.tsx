/* eslint-disable jsx-a11y/alt-text */
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { AnalysisResult, FeedbackItem } from "@/lib/types";

const logoPath = path.join(process.cwd(), "public", "kuza-logo-pdf.png");
const logoSrc = fs.existsSync(logoPath) ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}` : undefined;

const styles = StyleSheet.create({
  page: {
    padding: 34,
    color: "#18310f",
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.45
  },
  header: {
    borderBottom: "1px solid #dfe8d8",
    paddingBottom: 14,
    marginBottom: 18
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain"
  },
  brand: {
    fontSize: 10,
    color: "#0d6b05",
    fontWeight: 700,
    marginBottom: 7
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 8
  },
  summary: {
    color: "#66755f",
    fontSize: 11
  },
  scoreRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16
  },
  scoreBox: {
    width: 110,
    height: 86,
    padding: 12,
    borderRadius: 6,
    backgroundColor: "#18310f",
    color: "#ffffff",
    justifyContent: "center"
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 12
  },
  scoreLabel: {
    fontSize: 8,
    lineHeight: 1.2,
    color: "#fff8ec"
  },
  profileBox: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    border: "1px solid #dfe8d8"
  },
  profile: {
    color: "#0d6b05",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 8
  },
  item: {
    marginBottom: 7
  },
  itemTitle: {
    fontSize: 10,
    fontWeight: 700
  },
  muted: {
    color: "#66755f"
  },
  category: {
    border: "1px solid #dfe8d8",
    borderRadius: 6,
    padding: 10,
    marginBottom: 9
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5
  },
  categoryName: {
    fontWeight: 700,
    fontSize: 11
  },
  categoryScore: {
    color: "#0d6b05",
    fontWeight: 700
  },
  tag: {
    fontSize: 8,
    color: "#f58220",
    textTransform: "uppercase",
    marginBottom: 3
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 34,
    right: 34,
    color: "#66755f",
    fontSize: 8,
    borderTop: "1px solid #dfe8d8",
    paddingTop: 8
  }
});

export function CvReportDocument({ result }: { result: AnalysisResult }) {
  return (
    <Document title="CV Rank Full Report" author="Kuza Kizazi">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.brand}>CV Rank by Kuza Kizazi</Text>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>
          <Text style={styles.title}>Full CV Readiness Report</Text>
          <Text style={styles.summary}>Generated {new Date(result.generatedAt).toLocaleDateString("en-KE")}</Text>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreNumber}>{result.overallScore}</Text>
            <Text style={styles.scoreLabel}>CV score out of 100</Text>
          </View>
          <View style={styles.profileBox}>
            <Text style={styles.profile}>{result.profileLabel}</Text>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>
        </View>

        {result.parseWarning ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ATS Readability Risk</Text>
            <Text style={styles.muted}>{result.parseWarning}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What Is Already Working</Text>
          {result.strengths.length ? (
            result.strengths.map((strength) => (
              <Text key={strength} style={styles.item}>
                - {strength}
              </Text>
            ))
          ) : (
            <Text style={styles.muted}>The strongest improvements will come from adding clearer structure and evidence.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority Fixes</Text>
          {result.suggestions.slice(0, 6).map((item) => (
            <FeedbackBlock item={item} key={item.title} />
          ))}
        </View>

        <Text style={styles.footer}>Use this report as a checklist. Only add claims, skills, or metrics that are true and can be defended.</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.brand}>CV Rank by Kuza Kizazi</Text>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
          </View>
          <Text style={styles.title}>Category Breakdown</Text>
        </View>

        {result.categories.map((category) => (
          <View style={styles.category} key={category.name} wrap={false}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryScore}>{category.score}/100</Text>
            </View>
            <Text style={styles.muted}>{category.whatThisMeans}</Text>
            <Text>{category.summary}</Text>
            {category.strengths.length ? (
              <View style={styles.item}>
                <Text style={styles.itemTitle}>What is working</Text>
                {category.strengths.map((strength) => (
                  <Text key={strength} style={styles.muted}>
                    - {strength}
                  </Text>
                ))}
              </View>
            ) : null}
            {category.improvements.length ? (
              <View style={styles.item}>
                <Text style={styles.itemTitle}>How to improve this section</Text>
              </View>
            ) : null}
            {category.improvements.map((item) => (
              <FeedbackBlock compact item={item} key={item.title} />
            ))}
            <View style={styles.item}>
              <Text style={styles.itemTitle}>Rubric checks</Text>
              {category.checks.map((check) => (
                <Text key={check.label} style={styles.muted}>
                  - {check.passed ? "Passed" : "Needs work"}: {check.label}
                </Text>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Step</Text>
          <Text style={styles.muted}>
            If formatting, missing sections, or ATS readability are limiting the score, rebuild the CV at
            https://cv.kuzakizazi.com and use this report as your editing checklist.
          </Text>
        </View>

        <Text style={styles.footer}>Report ID: {result.reportId}</Text>
      </Page>
    </Document>
  );
}

function FeedbackBlock({ item, compact = false }: { item: FeedbackItem; compact?: boolean }) {
  return (
    <View style={styles.item}>
      <Text style={styles.tag}>{item.priority} priority</Text>
      <Text style={styles.itemTitle}>{item.title}</Text>
      {!compact ? <Text style={styles.muted}>{item.detail}</Text> : null}
      <Text>{item.action}</Text>
      {item.example ? <Text style={styles.muted}>Example: {item.example}</Text> : null}
    </View>
  );
}
