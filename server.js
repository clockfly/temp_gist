addEventListener('fetch', event => {

	if (isBackendAPIPath(event.request)) {
		event.respondWith(backendAPI(event.request));
	} else {
		event.respondWith(apiServer(event.request));
	}
})

function isBackendAPIPath(request) {
	console.log("EEEEEEE");
	const url = new URL(request.url);
	const subPaths = url.pathname.split("/");
	return subPaths.length > 1 && subPaths[1] === "backend-api";
}

function modifyResponse(originalResponse, disableCache, upstreamDomain, originalDomain) {
	const connectionUpgrade = originalResponse.headers.get('upgrade');
	if (connectionUpgrade?.toLowerCase() === 'websocket') {
		return originalResponse;
	}

	const headers = new Headers(originalResponse.headers);
	if (disableCache) {
		headers.set('Cache-Control', 'no-store');
	}
	headers.set('access-control-allow-origin', '*');
	headers.set('access-control-allow-credentials', true);
	headers.delete('content-security-policy');
	headers.delete('content-security-policy-report-only');
	headers.delete('clear-site-data');

	const pjaxUrl = headers.get('x-pjax-url');
	if (pjaxUrl != null) {
		headers.set('x-pjax-url', pjaxUrl.replace(`//${upstreamDomain}`, `//${originalDomain}`));
	}

	console.log("FFFFFFFFF");

	return new Response(originalResponse.body, {
		status: originalResponse.status,
		headers: headers
	});
}

async function apiServer(request) {
	const upstreamDomain = 'api.openai.com';
	const disableCache = false;

	const url = new URL(request.url);
	const originalDomain = url.hostname;
	url.host = upstreamDomain;
	const newRequestHeaders = new Headers(request.headers);
	newRequestHeaders.set('Host', upstreamDomain);

	const originalResponse = await fetch(url.href, {
		method: request.method,
		headers: newRequestHeaders,
		body: request.body
	});

	const originalResponseText = await originalResponse.text();

console.log(originalResponseText);

	return modifyResponse(originalResponse, disableCache, upstreamDomain, originalDomain);
}

function getAccessToken(request) {
	const authHeader = request.headers.get("authorization");
	if (authHeader === null) {
		return null;
	}

	const matches = authHeader.match(/Bearer (.+)/);
	if (matches === null) {
		return null;
	}

	const accessToken = matches[1];
	return accessToken;
}

function getPuid(request) {
	const puidHeader = request.headers.get("puid");
	if (puidHeader !== null) {
		return puidHeader;
	}

	const cookieHeader = request.headers.get("cookie");
	if (cookieHeader === null) {
		return null;
	}

	const matches = cookieHeader.match(/_puid=([^;]+)/);
	if (matches === null) {
		return null;
	}

	const puid = matches[1];
	return puid;
}

function buildHeaders(accessToken, puid, host) {
	const headers = new Headers();


	headers.set("authority", "chat.openai.com")
	headers.set("Host", "chat.openai.com")
	headers.set("Origin", "https://chat.openai.com/chat")
	headers.set("Connection", "keep-alive")
	headers.set("Content-Type", "application/json")
	headers.set("Keep-Alive", "timeout=360")
	headers.set("referer", "https://chat.openai.com/chat");
	headers.set("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36")

	if (accessToken !== null) {
		headers.set("Authorization", `Bearer ${accessToken}`);
	}

	if (puid !== null) {
		headers.set("Cookie", `_puid=${puid}`);
	}
	return headers;
}

async function backendAPI(request) {
	console.log("ENTER BACKEND API");
	// your backend-api handling logic
	const accessToken = getAccessToken(request);
	const puid = getPuid(request);
	const upstreamDomain = "chat.openai.com";
	const headers = buildHeaders(accessToken, puid, upstreamDomain);

	const url = new URL(request.url);
	const originalDomain = url.hostname;
	url.host = upstreamDomain;

	const headersMap = new Map();

for (const [key, value] of headers) {
  headersMap.set(key, value);
}

const headersString = JSON.stringify(Object.fromEntries(headersMap));

console.log(headersString);


console.log(url.href);

console.log(request.method);

console.log(request.body);



	const originalResponse = await fetch(url.href, {
		method: request.method,
		headers: headers,
		body: request.body
	});

	const disableCache = false;
	return modifyResponse(originalResponse, disableCache, upstreamDomain, originalDomain);
}
