type aiData = {
    role: "system" | "user" | "assistant";
    content: {
        text: string;
        img?: string;
    };
};

type chatgptm = {
    role: "system" | "user" | "assistant";
    content:
        | string
        | [
              { type: "text"; text: string },
              { type: "image_url"; image_url: { url: string } },
          ];
};

function toChatgptm(data: aiData): chatgptm {
    const { role, content } = data;
    if (content.img) {
        return {
            role,
            content: [
                { type: "text", text: content.text },
                { type: "image_url", image_url: { url: content.img } },
            ],
        };
    }
    return {
        role,
        content: content.text,
    };
}

function runAI(
    message: aiData[],
    x: { config: Record<string, unknown>; url: string; key: string },
) {
    const m: { messages: chatgptm[]; stream: boolean } & Record<
        string,
        unknown
    > = {
        messages: message.map(toChatgptm),
        stream: true,
    };
    for (const i in x.config) {
        m[i] = x.config[i];
    }
    let resultText = "";
    let streamFun: (text: string, end: boolean) => void = () => {};

    const abortController = new AbortController();
    const { promise, resolve } = Promise.withResolvers<string>();

    fetch(x.url, {
        method: "POST",
        headers: {
            authorization: `Bearer ${x.key}`,
            "content-type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify(m),
    }).then((res) => {
        if (!res.body) return;
        const reader = res.body.getReader();
        const textDecoder = new TextDecoder();
        reader.read().then(function readBody(result) {
            const text = textDecoder
                .decode(result.value)
                .split("\n")
                .map((i) =>
                    i
                        .trim()
                        .replace(/^data:/, "")
                        .trim(),
                )
                .filter((i) => i !== "");
            for (const i of text) {
                if (i === "[DONE]") {
                    abortController.abort();
                    streamFun(resultText, true);
                    resolve(resultText);
                    return;
                }
                parse(i);
            }

            reader.read().then(readBody);
        });
    });
    function parse(text: string) {
        let res = "";
        try {
            const data = JSON.parse(text);
            res =
                data.message?.content ||
                data.choices[0]?.message?.content ||
                data.choices[0]?.delta.content;
        } catch (error) {}
        resultText += res ?? "";
        streamFun(resultText, false);
    }

    return {
        text: promise,
        stream: (f: typeof streamFun) => {
            streamFun = f;
        },
        stop: () => {
            abortController.abort();
        },
    };
}

export { runAI };
export type { aiData };
