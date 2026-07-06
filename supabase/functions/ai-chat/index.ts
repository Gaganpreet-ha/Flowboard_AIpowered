import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task on the kanban board",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          status: {
            type: "string",
            enum: ["backlog", "todo", "in_review", "done", "cancelled"],
            description: "Which column to place the task",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority",
          },
          due_date: {
            type: "string",
            description: "Due date in YYYY-MM-DD format (optional)",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "List of label tags (optional)",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update fields of an existing task",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          due_date: { type: "string", description: "YYYY-MM-DD or null to clear" },
          labels: { type: "array", items: { type: "string" } },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_task",
      description: "Move a task to a different kanban column",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
          new_status: {
            type: "string",
            enum: ["backlog", "todo", "in_review", "done", "cancelled"],
          },
        },
        required: ["id", "new_status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Permanently delete a task",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Task UUID" },
        },
        required: ["id"],
      },
    },
  },
];

async function getMaxPosition(status: string): Promise<number> {
  const { data } = await supabase
    .from("tasks")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.position + 1000 : 1000;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: unknown; actionDescription: string }> {
  try {
    if (name === "create_task") {
      const status = (args.status as string) || "backlog";
      const position = await getMaxPosition(status);
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: args.title as string,
          description: (args.description as string) || "",
          status,
          priority: (args.priority as string) || "medium",
          due_date: (args.due_date as string) || null,
          labels: (args.labels as string[]) || [],
          position,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        result: data,
        actionDescription: `Created task "${args.title}"`,
      };
    }

    if (name === "update_task") {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.due_date !== undefined) updates.due_date = args.due_date || null;
      if (args.labels !== undefined) updates.labels = args.labels;
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", args.id as string)
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        result: data,
        actionDescription: `Updated task "${data.title}"`,
      };
    }

    if (name === "move_task") {
      const position = await getMaxPosition(args.new_status as string);
      const { data, error } = await supabase
        .from("tasks")
        .update({
          status: args.new_status as string,
          position,
          updated_at: new Date().toISOString(),
        })
        .eq("id", args.id as string)
        .select()
        .single();
      if (error) throw error;
      return {
        success: true,
        result: data,
        actionDescription: `Moved "${data.title}" to ${args.new_status}`,
      };
    }

    if (name === "delete_task") {
      const { data: task } = await supabase
        .from("tasks")
        .select("title")
        .eq("id", args.id as string)
        .maybeSingle();
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", args.id as string);
      if (error) throw error;
      return {
        success: true,
        result: { deleted: true },
        actionDescription: `Deleted task "${task?.title || args.id}"`,
      };
    }

    return { success: false, result: null, actionDescription: "Unknown tool" };
  } catch (err) {
    return {
      success: false,
      result: { error: String(err) },
      actionDescription: `Failed to execute ${name}`,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY is not configured. Add it in Supabase Edge Function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, boardState } = await req.json();

    const boardSummary = JSON.stringify(boardState, null, 2);
    const systemPrompt = `You are a project management assistant. You can see the user's full kanban board and can create, update, move, and delete tasks. Be concise. When asked what to work on, prioritize by due date and priority.

Current board state:
${boardSummary}

Today's date: ${new Date().toISOString().split("T")[0]}`;

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const actions: Array<{ type: string; description: string }> = [];

    // First call to OpenAI
    let response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: openAiMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    let completion = await response.json();
    let assistantMessage = completion.choices[0].message;

    // Agentic loop — handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      openAiMessages.push(assistantMessage);

      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (tc: { id: string; function: { name: string; arguments: string } }) => {
          const args = JSON.parse(tc.function.arguments);
          const result = await executeTool(tc.function.name, args);
          if (result.success) {
            actions.push({ type: tc.function.name, description: result.actionDescription });
          }
          return {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result.result),
          };
        })
      );

      openAiMessages.push(...toolResults);

      // Call OpenAI again with tool results
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openAiMessages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI error on follow-up: ${err}`);
      }

      completion = await response.json();
      assistantMessage = completion.choices[0].message;
    }

    return new Response(
      JSON.stringify({ reply: assistantMessage.content, actions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
