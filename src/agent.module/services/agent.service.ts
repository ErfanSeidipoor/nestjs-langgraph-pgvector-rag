import { DocumentInterface } from '@langchain/core/dist/documents/document';
import {
  AIMessage,
  BaseMessage,
  isHumanMessage,
} from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';

import { ChatPromptTemplate } from '@langchain/core/prompts';
import {
  Annotation,
  BaseCheckpointSaver,
  END,
  LangGraphRunnableConfig,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { formatDocumentsAsString } from 'langchain/util/document';
import { Thread } from 'src/postgres-db/entities';
import { Repository } from 'typeorm';
import z from 'zod';
import { EmbeddingService } from './embedding.service';
import * as fs from 'fs';

@Injectable()
export class AgentService {
  model = new ChatOpenAI({ model: 'gpt-4o' });

  /* -------------------------------------------------------------------------- */
  /*                                retrieveGraph                               */
  /* -------------------------------------------------------------------------- */
  /* ---------------------------------- State --------------------------------- */
  public static RetrieveState = Annotation.Root({
    documents: Annotation<DocumentInterface[]>({
      reducer: (x, y) => y ?? x ?? [],
    }),
    filteredDocuments: Annotation<DocumentInterface[]>({
      reducer: (x, y) => y ?? x ?? [],
    }),
    question: Annotation<string>({
      reducer: (x, y) => y ?? x ?? '',
    }),
    output: Annotation<string>({
      reducer: (x, y) => y ?? x,
    }),
  });

  /* ---------------------------------- Node ---------------------------------- */

  retrieveDocument_retrieveNode = async (
    state: typeof AgentService.RetrieveState.State,
    config: LangGraphRunnableConfig<{ thread_id: string }>,
  ): Promise<Partial<typeof AgentService.RetrieveState.State>> => {
    const thread = await this.getThread(config.configurable?.thread_id ?? '');

    const documents = await this.embeddingService.search({
      query: state.question,
      metadata: {
        userId: thread.userId,
      },
    });

    return { documents };
  };

  filterDocuments_retrieveNode = async (
    state: typeof AgentService.RetrieveState.State,
  ): Promise<Partial<typeof AgentService.RetrieveState.State>> => {
    const { documents, question } = state;

    const llmWithTool = this.model.withStructuredOutput(
      z
        .object({
          binaryScore: z
            .enum(['no', 'yes'])
            .describe("Relevance score 'yes' or 'no'"),
        })
        .describe(
          "Grade the relevance of the retrieved documents to the question. Either 'yes' or 'no'.",
        ),
      {
        name: 'grade',
      },
    );

    const prompt = ChatPromptTemplate.fromTemplate(`
      You are a strict grader assessing the relevance of a retrieved document to a user question.  You MUST answer with only "yes" or "no" – no other explanations or text are permitted.

      Here is the retrieved document:


      {context}

      Here is the user question: {question}

      A document is ONLY relevant if it contains keywords DIRECTLY from the user question OR expresses the EXACT SAME semantic meaning.  Synonyms, related concepts, or tangential information are NOT sufficient for relevance.  If the document meets this strict criterion, answer "yes". Otherwise, answer "no".
    `);

    const chain = prompt.pipe(llmWithTool);

    const filteredDocuments: typeof AgentService.RetrieveState.State.documents =
      [];

    for (const document of documents) {
      const grade = await chain.invoke({
        context: document.pageContent,
        question,
      });

      if (grade.binaryScore === 'yes') {
        filteredDocuments.push(document);
      }
    }

    return {
      filteredDocuments,
    };
  };

  generate_retrieveNode = async (
    state: typeof AgentService.RetrieveState.State,
  ): Promise<Partial<typeof AgentService.RetrieveState.State>> => {
    const prompt = ChatPromptTemplate.fromTemplate(`

      # Role
      You are an AI assistant focused on Question-Answering (QA) tasks within a Retrieval-Augmented Generation (RAG) system.
      Your primary goal is to provide precise answers based on the given context or chat history.
      
      # Instruction
      Provide a concise, logical answer by organizing the selected content into coherent paragraphs with a natural flow. 
      Avoid merely listing information. Include key numerical values, technical terms, jargon, and names. 
      DO NOT use any outside knowledge or information that is not in the given material.
      
      # Constraint
      - Review the provided context thoroughly and extract key details related to the question.
      - Craft a precise answer based on the relevant information.
      - Keep the answer concise but logical/natural/in-depth.
      - If the retrieved context does not contain relevant information or no context is available, respond with: 'I can't find the answer to that question in the context.'
      
      **Source** (Optional)
      - Cite the source of the information as a file name with a page number or URL, omitting the source if it cannot be identified.
      - (list more if there are multiple sources)
      
      # Question
      <question>
      {question}
      </question>
      
      # Context
      <retrieved context>
      {context}
      </retrieved context>
      
      # Answer
      
    `);
    const ragChain = prompt.pipe(this.model).pipe(new StringOutputParser());

    const output = await ragChain.invoke({
      context: formatDocumentsAsString(state.documents),
      question: state.question,
    });

    return { output };
  };

  noRelevantDocuments_retrieveNode = (): Partial<
    typeof AgentService.RetrieveState.State
  > => {
    return {
      output:
        "sorry, I couldn't find a relevant content to answer you question for it.",
    };
  };

  /* ---------------------------------- Edge ---------------------------------- */

  decideToGenerate_retrieveEdge = (
    state: typeof AgentService.RetrieveState.State,
  ): 'noRelevantDocuments_retrieveNode' | 'generate_retrieveNode' => {
    const filteredDocuments = state.filteredDocuments;
    if (filteredDocuments.length === 0) {
      return 'noRelevantDocuments_retrieveNode';
    }
    return 'generate_retrieveNode';
  };

  /* -------------------------------- workflow -------------------------------- */

  RetrieveWorkflow = new StateGraph(AgentService.RetrieveState)
    .addNode(
      'retrieveDocument_retrieveNode',
      this.retrieveDocument_retrieveNode,
    )
    .addNode('filterDocuments_retrieveNode', this.filterDocuments_retrieveNode)
    .addNode('generate_retrieveNode', this.generate_retrieveNode)
    .addNode(
      'noRelevantDocuments_retrieveNode',
      this.noRelevantDocuments_retrieveNode,
    )
    .addEdge(START, 'retrieveDocument_retrieveNode')
    .addEdge('retrieveDocument_retrieveNode', 'filterDocuments_retrieveNode')
    .addConditionalEdges(
      'filterDocuments_retrieveNode',
      this.decideToGenerate_retrieveEdge,
      ['noRelevantDocuments_retrieveNode', 'generate_retrieveNode'],
    )
    .addEdge('generate_retrieveNode', END)
    .addEdge('noRelevantDocuments_retrieveNode', END)
    .compile();

  /* -------------------------------------------------------------------------- */
  /*                                 Main Graph                                 */
  /* -------------------------------------------------------------------------- */
  /* ---------------------------------- State --------------------------------- */

  public static MainState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
    }),
    route: Annotation<'RETRIEVE' | 'MAIN' | typeof END>({
      reducer: (x, y) => y ?? x,
    }),
    retrieve_output: Annotation<string>({
      reducer: (x, y) => y ?? x,
    }),
  });

  /* ---------------------------------- Node ---------------------------------- */

  router_node = async (
    state: typeof AgentService.MainState.State,
    config: LangGraphRunnableConfig<{ thread_id: string }>,
  ): Promise<Partial<typeof AgentService.MainState.State>> => {
    await this.getThread(config.configurable?.thread_id ?? '');

    const { messages } = state;

    const lastMessage = messages[messages.length - 1];
    if (!isHumanMessage(lastMessage)) {
      return { route: END };
    }

    const routeSchema = z.object({
      route: z
        .enum(['RETRIEVE', 'MAIN'])
        .describe('the next step in the routing process'),
    });

    const { route } = await this.model
      .withStructuredOutput(routeSchema)
      .invoke([
        {
          role: 'system',
          content: `
          Route the input RETRIEVE, or MAIN based on the user's request and previous messages.
          you need to consider the context of the conversation and the user's intent.

          if user ask for a specific document OR ask a question that you couldn't answer based on previous messages, you should route to RETRIEVE. 
          if user ask for a general question OR you could answer to the question based on the previous messages, you should route to MAIN.`,
        },
        ...messages,
        {
          role: 'user',
          content: lastMessage.content,
        },
      ]);

    return { route };
  };

  callModel_node = async (state: typeof AgentService.MainState.State) => {
    const systemPrompt = {
      role: 'system',
      content: `
      You are a highly intelligent and professional AI assistant. Your primary role is to assist users by providing accurate, concise, and contextually relevant answers based on the documents they have uploaded, which are stored in the vector database. 
      Always maintain a professional tone, ensure clarity in your responses, and avoid introducing any information that is not derived from the provided documents or context. 
      If the requested information is unavailable, politely inform the user and suggest alternative approaches if applicable.
      `,
    };

    const response = await this.model.invoke([systemPrompt, ...state.messages]);
    return { messages: [response] };
  };

  retrieveGraph_node = async (
    state: typeof AgentService.MainState.State,
    config: LangGraphRunnableConfig<{ thread_id: string }>,
  ): Promise<Partial<typeof AgentService.MainState.State>> => {
    const lastMessage = state.messages[state.messages.length - 1];

    if (!isHumanMessage(lastMessage)) {
      throw new Error('last message is not a human message');
    }

    if (typeof lastMessage.content !== 'string') {
      throw new Error('last message content is not a string');
    }

    const response = await this.RetrieveWorkflow.invoke(
      {
        question: lastMessage.content,
      },
      config,
    );

    return { messages: [new AIMessage({ content: response.output })] };
  };

  /* ---------------------------------- Edge ---------------------------------- */

  decideToRoute_edge = (
    state: typeof AgentService.MainState.State,
  ): 'retrieveGraph_node' | 'callModel_node' | typeof END => {
    const route = state.route;
    if (route === 'RETRIEVE') {
      return 'retrieveGraph_node';
    } else if (route === END) {
      return END;
    }
    return 'callModel_node';
  };

  /* -------------------------------- workflow -------------------------------- */

  workflow = new StateGraph(AgentService.MainState)
    .addNode('router_node', this.router_node)
    .addNode('callModel_node', this.callModel_node)
    .addNode('retrieveGraph_node', this.retrieveGraph_node)

    .addEdge(START, 'router_node')
    .addConditionalEdges('router_node', this.decideToRoute_edge, [
      'callModel_node',
      'retrieveGraph_node',
      END,
    ])
    .addEdge('retrieveGraph_node', END)
    .addEdge('callModel_node', END);

  /* -------------------------------------------------------------------------- */
  /*                                 constructor                                */
  /* -------------------------------------------------------------------------- */

  constructor(
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(Thread)
    private readonly threadRepository: Repository<Thread>,
  ) {}

  getThread = async (threadId: string) => {
    const thread = await this.threadRepository.findOne({
      where: { id: threadId },
    });
    if (!thread) {
      throw new Error('Thread not found');
    }
    return thread;
  };

  app(checkpointer: BaseCheckpointSaver) {
    return this.workflow.compile({
      checkpointer,
    });
  }

  async print() {
    const app = this.workflow.compile();
    const mainGraphBuffer = (
      await (await app.getGraphAsync()).drawMermaidPng({})
    ).arrayBuffer();
    fs.writeFileSync('./main-graph.png', Buffer.from(await mainGraphBuffer));

    const retrieveGraphBuffer = (
      await (await this.RetrieveWorkflow.getGraphAsync()).drawMermaidPng({})
    ).arrayBuffer();
    fs.writeFileSync(
      './retrieve-graph.png',
      Buffer.from(await retrieveGraphBuffer),
    );
  }
}
