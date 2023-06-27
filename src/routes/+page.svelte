<script>
  import { fade } from "svelte/transition";
  import {SyncLoader} from "svelte-loading-spinners";
  import Slider from '@bulatdashiev/svelte-slider';
  import { ESTIMATED_CHAR_LIMIT } from "$lib/constants";
  import Icon from "@iconify/svelte";
  import SvelteSeo from "svelte-seo";
  import { localStorageStore } from '$lib/localStorageStore';
  import {error} from "@sveltejs/kit";
  import { MIDJOURNEY_EXPLANATION_TINY} from "$lib/constants";
import {PROMPT_FILLER_EXPLANATION} from "$lib/constants.js";


  const apiKey = localStorageStore('apiKey', '');
  const instructions = localStorageStore('instructions', '');
  const nbResults = localStorageStore('nbResults', [1, 20]);
  const selectedPersonality = localStorageStore('selectedPersonality', 'photographer');
  const replies = localStorageStore('replies', []);

  let isLoading = false;
  let isIdeasLoading = false;
  let errorMessage = "";
  let isCopied = [];
  $:buttonText = $nbResults[0] > 1 ? "生成多个提示词" : "生成提示词";

  const personalities = [
    {
      key: "photographer",
      label: "摄影师",
      imgSrc: "photographer.png",
    },
    {
      key: "painter",
      label: "画家",
      imgSrc: "painter.png",
    },
    {
      key: "fashion_designer",
      label: "时装设计师",
      imgSrc: "fashion_designer.png",
    },
    {
      key: "street_photographer",
      label: "街头摄影师",
      imgSrc: "street_photographer.png",
    },
    {
      key: "movie_concept_artist",
      label: "电影海报",
      imgSrc: "movie_concept_artist.png",
    },
    {
      key: "graphic_designer",
      label: "平面设计师",
      imgSrc: "graphic_designer.png",
    },
    {
      key: "graphic_novel_artist",
      label: "漫画",
      imgSrc: "graphic_novel_artist.png",
    },
    {
      key: "architect",
      label: "建筑师",
      imgSrc: "architect.png",
    },
    //  {
    //    key: "crazy_artist",
    //    label: "疯狂艺术家",
    //    imgSrc: "crazy_artist.png",
    //  },
    //  {
    //    key: "weight_master",
    //    label: "素描大师",
    //    imgSrc: "weight_master.png",
    //  }

  ];
  async function handleSubmitIdea() {
    if (!$apiKey) {
      errorMessage = '请输入密钥';
      return;
    }
    errorMessage = null;
    isIdeasLoading = true;
    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personality_key: $selectedPersonality,
          api_key: $apiKey,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error:", errorData)
        errorMessage = errorData.message || '发生未知错误';
      } else {
        const data = await response.json();
        $instructions = data.idea;
      }
    } catch (error) {
      console.error('Error:', error);
      errorMessage = 'Error: ' + error;
    }
    isIdeasLoading = false;
  }

  async function handleSubmit() {
    if (!$apiKey || !$instructions) {
      errorMessage = '请输入你的密钥和初始提示词';
      return;
    }
    errorMessage = null;
    isLoading = true;
    try {
      const max_tokens = 1000;
      const messages = [
        { role: "system", content: MIDJOURNEY_EXPLANATION_TINY + " " + PROMPT_FILLER_EXPLANATION},
        { role: "user", content: `Give me ${$nbResults[0]} examples of: ${$instructions} on separate lines, without numbering.` },
      ];
      const response = await fetch("https://oapi.czl.net/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${$apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: messages,
          max_tokens: max_tokens,
          n: 1,
          stop: null,
          temperature: 0.5,
          stream: true,
        }),
      });
      // Read the response as a stream of data
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      $replies = [];
      let reply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        // Massage and parse the chunk of data
        const chunk = decoder.decode(value);
        const lines = chunk.split("data:");

        // this is what a line looks like:
        // {"id":"chatcmpl-7Lly9472ato9dwbVlFybPbvvW6sYa","object":"chat.completion.chunk","created":1685423637,"model":"gpt-3.5-turbo-0301","choices":[{"delta":{"content":"."},"index":0,"finish_reason":null}]}
        // JSON can be malformed, and we only care about "content":"." so we'll do some string parsing
        const parsedLines = lines
          .map(line => line.replace(/\\n\\n$/, "").trim())
          .filter(line => line !== "" && line !== "[DONE]")
          .map(line => {
              try {
                  let parsed = JSON.parse(line);
                  // if the parsed line has choices array and the first item has a 'content' property
                  if (parsed.choices && parsed.choices[0] && 'content' in parsed.choices[0].delta) {
                      return parsed.choices[0].delta.content;
                  }
              } catch (err) {
                  console.log("PROBLEM", err, `"${line}"`);
              }
              return null;
          })
          .filter(content => content !== null);  // Remove null items
        for (const parsedLine of parsedLines) {
          if (parsedLine==""){
            $replies = [...$replies, reply];
            reply = "";
          }
          else if (parsedLine.includes("\n")){
            reply += parsedLine.substring(0, parsedLine.indexOf("\n"));
            reply = reply.substring(reply.indexOf("/imagine"));
            $replies = [...$replies.slice(0, $replies.length - 1), reply];
            reply = parsedLine.substring(parsedLine.indexOf("\n"));
            $replies = [...$replies, reply];
          }
          else{
            reply += parsedLine;
            $replies = [...$replies.slice(0, $replies.length - 1), reply];
          }
        }
      }
      reply = $replies[$replies.length - 1];
      $replies = [...$replies.slice(0, $replies.length - 1), reply.substring(reply.indexOf("/imagine"))];
  }
  catch (err) {
    console.error("生成提示时出错:", err);
    errorMessage = '错误: ' + error;
  }
    isLoading = false;
  }
  async function copyToClipboard(text, index) {
    try {
      await navigator.clipboard.writeText(text);
      isCopied[index] = true;
      isCopied = [...isCopied];
      setTimeout(() => {
        isCopied[index] = false;
        isCopied = [...isCopied];
      }, 1500);
    } catch (err) {
      console.error('复制失败： ', err);
    }
  }

</script>

<svelte:head>

  <style>
    body {
      font-family: sans-serif;
      font-size: 12px;
    }
  </style>
  <title>Image Prompt by CZL</title>
</svelte:head>

<main>
  <div class="title">
    <img src="https://cdn-img.czl.net/2023/06/10/12blije.png" class="logo" alt="CZL Logo" />
    <h1>
      Image Prompt by CZL
    </h1>
  </div>
  <p style="color:#00000;font-size:14px;text-align:center;">提示：选择风格，点击随机生成，会生成一套提示词模板；<br>如果您输入了初始提示词，风格的选择将无效。<br>密钥请在<a href="https://oapi.czl.net" target="_blank">https://oapi.czl.net</a>获取</p>
  


  <label for="api-key">密钥:</label>
  <input
      type="text"
      id="api-key"
      bind:value="{$apiKey}"
      placeholder="输入您的密钥"
  />
  <label for="personality" style="margin-top:20px;">风格:</label>
  <div class="personality-cards">
    {#each personalities as personality}
      <div
          class="personality-card {$selectedPersonality === personality.key ? 'selected' : ''}"
          on:click={() => ($selectedPersonality = personality.key)}
      >
        <img class="icon" src="{personality.imgSrc}" alt="{personality.label}" />
        <span class="perso-title">{personality.label}</span>
      </div>
    {/each}
  </div>
  <div class="instructions-header">
    <label class="instructions-label" for="instructions">初始提示词:</label>
    <button class="instructionsButton" on:click={handleSubmitIdea} disabled="{!$apiKey || isIdeasLoading}">随机生成</button>
    {#if isIdeasLoading}
    <div class="loading">
      <SyncLoader size="2.5" color="#5147a8" unit="rem" duration="0.5s"/>
    </div>
    {/if}
  </div>

  <textarea
      id="instructions"
      bind:value="{$instructions}"
      placeholder="输入初始提示词"
      maxlength="{ESTIMATED_CHAR_LIMIT}"
      rows="5"
  />

  <div class="numberResults">
    <label for="nb-results">生成数量: {$nbResults[0]}</label>
    <Slider bind:value={$nbResults} min={1} max={20} step={1} />
  </div>


  <div class="submit">
    <button on:click="{handleSubmit}" disabled="{!$apiKey || isLoading}">
      {buttonText}
    </button>
  </div>


  {#if isLoading}
    <div class="loading">
      <SyncLoader size="2.5" color="#5147a8" unit="rem" duration="0.5s"/>
    </div>
  {/if}
  {#if errorMessage}
    <div class="error" transition:fade>{errorMessage}</div>
  {/if}
  {#if $replies && $replies.length > 0}
    <div class="results">
      {#each $replies as reply, index}
        <div class="result" transition:fade>
          <div class="result-content">
            <div class="result-title">
              <h3>Result {index + 1}:</h3>
              <div class="result-icon">
                <button class="copy-button {isCopied[index] ? 'pushed' : ''}" on:click={() => copyToClipboard(reply, index)}>
                  <Icon icon="lucide:clipboard-copy" width="18px" />
                </button>
                {#if isCopied[index]}
                  <div class="tooltip">复制成功!</div>
                {/if}
              </div>
            </div>
            <p>{reply}</p>
          </div>

        </div>
      {/each}
    </div>
  {/if}

  <footer>
    
  </footer>
</main>

<style>
  .result-title{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
  }
  .instructions-header{
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .instructions-label{
    margin-bottom: 0;
  }
  .instructionsButton{
    margin: 0;
    padding: 7px 12px;
  }
  .logo{
    object-fit: cover;
    width: 45px;
  }

  .copy-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: auto;
  }

  .copy-button:focus {
    outline: none;
  }

  .numberResults{
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    width: 300px;
  }
  .lengthOptions{
    max-width: 200px;
    color: #222222;
  }
  .info{
    font-size: 12px;
    color: #aaa;
    margin-bottom: 1.5rem;
    margin-top: 0;
  }
  .error{
    color: red;
    margin-top: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .submit{
    display: flex;
    justify-content: center;
    align-items: center;
  }
  label{
    display: block;
    margin-bottom: 1rem;
    font-size: 16px;
  }
  .title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .title svg {
    width: 50px; /* Adjust the size according to your preference */
    height: auto;
    fill: #F9F9FC; /* Change the color to a lighter one */
  }
  :global(body) {
    margin: 0;
    background-color: #222;
    color: #F9F9FC;
  }

  main {
    max-width: 1000px;
    margin: 0 auto;
    padding: 1rem;
  }

  h1 {
    text-align: center;
  }
  h1, h2, h3 {
    color: #eee;
    margin: .5rem 0;
  }

  input, textarea {
    width: 95%;
    padding: 0.5rem;
    border: none;
    border-radius: 5px;
    margin-bottom: 1rem;
    font-family: inherit;
    color: #333;
    background-color: #eee;
    resize: none;
    outline: none;
  }

  button {
    font-family: inherit;
    font-size: 16px;
    padding: 12px 20px;
    border: 2px solid #333;
    border-radius: 6px;
    background-color: white;
    cursor: pointer;
    outline: none;
    transition: all 0.3s ease;
  }
  button:hover {
    border-color: #555;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  button {
    margin-top: 16px;
    background-color: #5147a8;
    color: white;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 3rem;
  }

  .results {
    margin-top: 20px;
    display: grid;
    grid-template-columns: 1fr;
    grid-gap: 1rem;
  }

  .result {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    background-color: #414040;
    padding: .5rem;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }


  .result-content {
    padding-right: 1rem;
  }

  .result-icon {
    cursor: pointer;
    position: relative;
  }
  .result-icon.pushed {
    transform: translateY(2px);
    color: #5f5fff;
  }

  .tooltip {
    position: absolute;
    background-color: #555;
    color: #fff;
    text-align: center;
    border-radius: 4px;
    padding: 0.5rem;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    margin-top: 0.5rem;
  }

  .tooltip::after {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: transparent transparent #555 transparent;
  }



  footer {
    margin-top: 6rem;
    text-align: center;
  }

  a {
    color: #5f5fff;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
  .personality-cards {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: .4rem;
    margin-bottom: 2rem;
  }

  .personality-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 80px;
    height: 120px;
    background-color: #f5f5f5;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: transform 0.2s ease;
    gap: 5px;
    padding-top: 5px;
  }

  .personality-card:hover {
    transform: translateY(-4px);
  }

  .personality-card.selected {
    border: 3px solid #8888e0;
    box-shadow: 0 4px 6px rgba(83, 83, 187, 0.2);
    transform: scale(1.01);
  }

  .personality-card .icon {
    width: 100%;
    height: auto;
    max-height: 70%; /* You can adjust this value to limit the height of the image within the card */
    object-fit: contain;
  }

  .personality-card .perso-title {
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    color: #333;
  }


  @media (max-width: 600px) {
    main {
      padding: 1rem 0.5rem;
    }
  }
</style>
