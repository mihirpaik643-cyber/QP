// netlify/functions/analyze.js
//
// This function runs on Netlify's servers, NOT in the browser.
// It keeps your ANTHROPIC_API_KEY secret and forwards the request to Anthropic.
//
// Set the key in: Netlify dashboard -> Site configuration -> Environment variables
//   Key:   ANTHROPIC_API_KEY
//   Value: sk-ant-...your real key...
//
// Never put the key in any file inside src/ or commit it to git.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server is missing ANTHROPIC_API_KEY. Set it in Netlify environment variables."
      })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { fileContent, prompt } = payload;
  if (!fileContent || !prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing fileContent or prompt" })
    };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: [fileContent, { type: "text", text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.error?.message || `Anthropic API error ${response.status}` })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unexpected server error" })
    };
  }
};
