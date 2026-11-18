/**
 * Converts telemetry input and output payloads into clean, human-readable GitHub-flavored Markdown text.
 */
export function formatPayloadToMarkdown(data: any, isInput: boolean = true): string {
  if (data === null || data === undefined) {
    return "*No data recorded.*";
  }

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return "*Empty.*";
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return formatPayloadToMarkdown(parsed, isInput);
      } catch {
        // Return raw text
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return "*Empty list.*";
    if (
      data[0] &&
      typeof data[0] === "object" &&
      ("role" in data[0] || "content" in data[0] || "type" in data[0])
    ) {
      return formatMessages(data);
    }
    if (data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return formatTable(data);
    }
    return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  }

  if (typeof data !== "object") {
    return String(data);
  }

  const sections: string[] = [];

  // 1. LLM Chat messages
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    sections.push(formatMessages(data.messages));
  }

  // 2. Natural query / objective / prompt
  for (const key of ["objective", "query", "question", "prompt"]) {
    if (key in data && data[key] && !Array.isArray(data[key])) {
      const val = data[key];
      if (typeof val === "string") {
        sections.push(`### **${capitalize(key)}**\n\n${val}\n`);
      } else if (typeof val === "object") {
        sections.push(`### **${capitalize(key)}**\n\n\`\`\`json\n${JSON.stringify(val, null, 2)}\n\`\`\`\n`);
      }
    }
  }

  // 3. Python code or scripts
  for (const key of ["code", "python_code", "script"]) {
    if (key in data && data[key] && typeof data[key] === "string") {
      sections.push(`### **Python Code**\n\n\`\`\`python\n${data[key].trim()}\n\`\`\`\n`);
    }
  }

  // 4. SQL / Database queries
  if (data.sql && typeof data.sql === "string") {
    sections.push(`### **SQL Query**\n\n\`\`\`sql\n${data.sql.trim()}\n\`\`\`\n`);
  }

  if (data.collection || data.table || data.database) {
    const metaParts = [];
    if (data.database) metaParts.push(`**Database**: \`${data.database}\``);
    if (data.collection) metaParts.push(`**Collection**: \`${data.collection}\``);
    if (data.table) metaParts.push(`**Table**: \`${data.table}\``);
    if (data.connection_id) metaParts.push(`**Connection**: \`${data.connection_id}\``);
    if (metaParts.length > 0) {
      sections.push(metaParts.join(" • ") + "\n");
    }
  }

  if (data.pipeline) {
    sections.push(`### **Aggregation Pipeline**\n\n\`\`\`json\n${JSON.stringify(data.pipeline, null, 2)}\n\`\`\`\n`);
  }

  // 5. LLM output content (completion)
  if ("content" in data && data.content) {
    const content = data.content;
    if (typeof content === "string") {
      sections.push(`### **Generated Response**\n\n${content.trim()}\n`);
    } else if (Array.isArray(content)) {
      for (const item of content) {
        if (item && typeof item === "object" && (item.__class__ === "FunctionCall" || item.name)) {
          const fnName = item.name || "FunctionCall";
          const args = typeof item.arguments === "string" ? item.arguments : JSON.stringify(item.arguments, null, 2);
          sections.push(`### **Tool Call Proposed: \`${fnName}\`**\n\n\`\`\`json\n${args}\n\`\`\`\n`);
        } else {
          sections.push(`\`\`\`json\n${JSON.stringify(item, null, 2)}\n\`\`\`\n`);
        }
      }
    }
  }

  // 6. Tool calls
  if (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) {
    for (const tc of data.tool_calls) {
      const fnName = tc.name || tc.__class__ || "Tool Call";
      const args = typeof tc.arguments === "string" ? tc.arguments : JSON.stringify(tc.arguments || tc, null, 2);
      sections.push(`### **Tool Invocation: \`${fnName}\`**\n\n\`\`\`json\n${args}\n\`\`\`\n`);
    }
  }

  // 7. Output result or summary
  if (data.result) {
    if (typeof data.result === "string") {
      sections.push(`### **Execution Result**\n\n${data.result.trim()}\n`);
    } else if (typeof data.result === "object") {
      if (data.result.summary) {
        sections.push(`### **Findings Summary**\n\n${data.result.summary.trim()}\n`);
      }
      if (data.result.sql_query) {
        sections.push(`### **Executed SQL**\n\n\`\`\`sql\n${data.result.sql_query.trim()}\n\`\`\`\n`);
      }
      if (Array.isArray(data.result.rows)) {
        sections.push(formatTable(data.result.rows));
      }
    }
  }

  // 8. Tabular output rows
  if (data.output && typeof data.output === "object") {
    if (Array.isArray(data.output.rows)) {
      sections.push(formatTable(data.output.rows));
    } else if (data.output.schema && Array.isArray(data.output.schema)) {
      sections.push(`### **Schema Definition**\n\n` + formatTable(data.output.schema));
    }
  }

  // 9. Document RAG chunks
  if (Array.isArray(data.chunks) && data.chunks.length > 0) {
    const chunkLines: string[] = [`### **Retrieved Document Chunks (${data.chunks.length})**\n`];
    data.chunks.slice(0, 15).forEach((c: any, i: number) => {
      const title = c.chunk_id || c.file_id || `Chunk #${i + 1}`;
      const score = c.score !== undefined ? ` • Score: \`${c.score}\`` : "";
      const text = c.text_preview || c.text || "";
      chunkLines.push(`**${i + 1}. \`${title}\`**${score}\n> ${text.replace(/\n+/g, " ").slice(0, 300)}...\n`);
    });
    if (data.chunks.length > 15) {
      chunkLines.push(`*...and ${data.chunks.length - 15} more chunks*`);
    }
    sections.push(chunkLines.join("\n"));
  }

  // 10. Standard stdout/stderr in sandbox
  if (data.stdout && typeof data.stdout === "string") {
    sections.push(`### **Standard Output**\n\n\`\`\`\n${data.stdout.trim()}\n\`\`\`\n`);
  }
  if (data.stderr && typeof data.stderr === "string") {
    sections.push(`### **Standard Error**\n\n\`\`\`\n${data.stderr.trim()}\n\`\`\`\n`);
  }

  // Fallback if no specific section was matched
  if (sections.length === 0) {
    return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
  }

  return sections.join("\n\n").trim();
}

function formatMessages(messages: any[]): string {
  const parts: string[] = [];
  messages.forEach((msg, idx) => {
    const role = (msg.role || msg.type || `Message ${idx + 1}`).toUpperCase();
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2);
    parts.push(`#### **${role}**\n\n${content}\n\n---`);
  });
  return parts.join("\n\n");
}

function formatTable(rows: any[]): string {
  if (rows.length === 0) return "*Empty table result.*";
  const first = rows[0];
  if (typeof first !== "object" || first === null) {
    return rows.map((r) => `- ${String(r)}`).join("\n");
  }

  const cols = Object.keys(first);
  const header = "| " + cols.join(" | ") + " |";
  const sep = "| " + cols.map(() => "---").join(" | ") + " |";
  const body = rows
    .slice(0, 20)
    .map((r) => {
      return (
        "| " +
        cols
          .map((c) => {
            const v = r[c];
            return typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
          })
          .join(" | ") +
        " |"
      );
    })
    .join("\n");

  const more = rows.length > 20 ? `\n\n*...and ${rows.length - 20} more rows*` : "";
  return `${header}\n${sep}\n${body}${more}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

