import { END, StateGraph } from "@langchain/langgraph";
import { clarificationNode } from "./nodes/clarification";
import { classifyIntentNode } from "./nodes/classifyIntent";
import { responseNode } from "./nodes/response";
import { searchNode } from "./nodes/search";
import { GraphState, type GraphStateType } from "./state";

/**
 * Routing function: determines whether to clarify or search
 */
function shouldClarify(state: GraphStateType): "clarify" | "search" {
  // If we explicitly need clarification, go to clarify node
  if (state.needsClarification) {
    return "clarify";
  }

  // If intent is clarification_needed, go to clarify
  if (state.intent === "clarification_needed") {
    return "clarify";
  }

  // If confidence is very low and no entities, clarify
  if (
    state.intentConfidence < 0.5 &&
    state.extractedEntities.pokemonNames.length === 0 &&
    state.extractedEntities.types.length === 0
  ) {
    return "clarify";
  }

  // Otherwise proceed to search
  return "search";
}

/**
 * Build the Pokemon assistant graph
 *
 * Flow:
 *   classify → (clarify | search) → respond → END
 *
 *   If clarification is needed:
 *     classify → clarify → END (returns question, waits for user)
 *
 *   If search can proceed:
 *     classify → search → respond → END
 */
export function buildPokemonGraph() {
  const graph = new StateGraph(GraphState)
    // Add all nodes
    .addNode("classify", classifyIntentNode)
    .addNode("clarify", clarificationNode)
    .addNode("search", searchNode)
    .addNode("respond", responseNode)

    // Entry point: always start with classification
    .addEdge("__start__", "classify")

    // Conditional routing after classification
    .addConditionalEdges("classify", shouldClarify, {
      clarify: "clarify",
      search: "search"
    })

    // Clarification ends the graph (returns to user)
    .addEdge("clarify", END)

    // Search results go to response generation
    .addEdge("search", "respond")

    // Response ends the graph
    .addEdge("respond", END);

  return graph.compile();
}

// Export the compiled graph
export const pokemonGraph = buildPokemonGraph();
