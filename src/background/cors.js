const METHODS = "GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH";
const HEADER_VALUE =
  "Authorization, Content-Type, X-Requested-With, Range, Accept, Origin, Referer";

const GLOBAL_RULE_ID = 100;
const PREFLIGHT_RULE_ID = 101;
const STRIP_RULE_ID = 102;
const TAB_RULE_OFFSET = 1000;

function parseOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function buildCorsHeaders(originValue) {
  const origin = originValue || "*";
  return [
    {
      header: "Access-Control-Allow-Origin",
      operation: "set",
      value: origin,
    },
    {
      header: "Access-Control-Allow-Methods",
      operation: "set",
      value: METHODS,
    },
    {
      header: "Access-Control-Allow-Headers",
      operation: "set",
      value: `${HEADER_VALUE}, *`,
    },
    {
      header: "Access-Control-Allow-Credentials",
      operation: "set",
      value: "true",
    },
    {
      header: "Access-Control-Expose-Headers",
      operation: "set",
      value: "*",
    },
  ];
}

class CorsHandler {
  constructor() {
    this.enabled = false;
    this.ruleScope = "dynamic";
    this.tabRules = new Map();
    this.listenersAttached = false;
    this.globalRuleIds = [GLOBAL_RULE_ID, PREFLIGHT_RULE_ID, STRIP_RULE_ID];
  }

  get dnr() {
    return chrome?.declarativeNetRequest;
  }

  get supportsDnr() {
    return Boolean(this.dnr?.updateSessionRules);
  }

  async init() {
    if (!this.supportsDnr) {
      console.warn("[Webmap] declarativeNetRequest API unavailable");
      return;
    }
    await this.enable();
    this.seedTabs();
    this.attachListeners();
  }

  buildGlobalRules() {
    const commonHeaders = buildCorsHeaders("*");
    return [
      {
        id: GLOBAL_RULE_ID,
        priority: 100,
        action: { type: "modifyHeaders", responseHeaders: commonHeaders },
        condition: {
          urlFilter: "*",
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "xmlhttprequest",
            "script",
            "image",
            "font",
            "stylesheet",
            "object",
            "media",
            "websocket",
            "other",
          ],
        },
      },
      {
        id: PREFLIGHT_RULE_ID,
        priority: 101,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            ...commonHeaders,
            {
              header: "Access-Control-Max-Age",
              operation: "set",
              value: "86400",
            },
          ],
        },
        condition: {
          urlFilter: "*",
          requestMethods: ["options"],
        },
      },
      {
        id: STRIP_RULE_ID,
        priority: 90,
        action: {
          type: "modifyHeaders",
          responseHeaders: [
            { header: "X-Frame-Options", operation: "remove" },
            { header: "Content-Security-Policy", operation: "remove" },
          ],
        },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame", "sub_frame", "xmlhttprequest", "other"],
        },
      },
    ];
  }

  buildTabRule(tabId, origin) {
    return {
      id: TAB_RULE_OFFSET + tabId,
      priority: 200,
      action: {
        type: "modifyHeaders",
        responseHeaders: buildCorsHeaders(origin),
      },
      condition: {
        urlFilter: "*",
        tabIds: [tabId],
      },
    };
  }

  async applyRules({ addRules, removeRuleIds }) {
    const addIds = addRules?.map((r) => r.id) ?? [];
    const removeIds = removeRuleIds ?? [];
    try {
      await this.dnr.updateDynamicRules({
        addRules,
        removeRuleIds: removeIds,
      });
      this.ruleScope = "dynamic";
      return addIds;
    } catch (error) {
      console.warn("[Webmap] Dynamic rules failed, falling back to session", error);
    }

    await this.dnr.updateSessionRules({
      addRules,
      removeRuleIds: removeIds,
    });
    this.ruleScope = "session";
    return addIds;
  }

  async enable() {
    if (!this.supportsDnr) return false;
    const rules = this.buildGlobalRules();
    const ruleIds = rules.map((r) => r.id);
    await this.applyRules({ addRules: rules, removeRuleIds: ruleIds });
    this.enabled = true;
    console.log("[CORS Handler] Enabled global rules", { scope: this.ruleScope });
    return true;
  }

  async disable() {
    if (!this.supportsDnr) return;
    const removeIds = [
      ...this.globalRuleIds,
      ...Array.from(this.tabRules.values()).map((entry) => entry.ruleId),
    ];
    try {
      await this.dnr.updateDynamicRules({ removeRuleIds: removeIds, addRules: [] });
    } catch {}
    try {
      await this.dnr.updateSessionRules({ removeRuleIds: removeIds, addRules: [] });
    } catch {}
    this.tabRules.clear();
    this.enabled = false;
  }

  async toggle() {
    if (this.enabled) {
      await this.disable();
      return false;
    }
    await this.enable();
    await this.seedTabs();
    return this.enabled;
  }

  async upsertTabRule(tabId, origin) {
    if (!this.supportsDnr) return;
    if (typeof tabId !== "number" || tabId < 0) return;
    const normalizedOrigin = origin || null;
    const cached = this.tabRules.get(tabId);
    if (cached && cached.origin === normalizedOrigin) {
      return;
    }

    const rule = this.buildTabRule(tabId, normalizedOrigin);
    await this.dnr.updateSessionRules({
      addRules: [rule],
      removeRuleIds: [rule.id],
    });

    this.tabRules.set(tabId, { ruleId: rule.id, origin: normalizedOrigin });
  }

  async removeTabRule(tabId) {
    if (!this.supportsDnr) return;
    const ruleId = TAB_RULE_OFFSET + tabId;
    try {
      await this.dnr.updateSessionRules({ removeRuleIds: [ruleId], addRules: [] });
    } catch {}
    this.tabRules.delete(tabId);
  }

  seedTabs() {
    if (!chrome?.tabs?.query) return;
    chrome.tabs.query({}, (tabs) => {
      if (!Array.isArray(tabs)) return;
      tabs.forEach((tab) => {
        const origin = parseOrigin(tab?.url);
        if (origin) {
          this.upsertTabRule(tab.id, origin);
        }
      });
    });
  }

  attachListeners() {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    if (chrome?.webRequest?.onBeforeRequest?.addListener) {
      chrome.webRequest.onBeforeRequest.addListener(
        (details) => {
          if (details?.type === "main_frame") {
            const origin = parseOrigin(details.url);
            this.upsertTabRule(details.tabId, origin);
          }
        },
        { urls: ["<all_urls>"], types: ["main_frame"] },
        []
      );
    }

    if (chrome?.tabs?.onUpdated?.addListener) {
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo?.url) {
          const origin = parseOrigin(changeInfo.url);
          this.upsertTabRule(tabId, origin);
        }
      });
    }

    if (chrome?.tabs?.onRemoved?.addListener) {
      chrome.tabs.onRemoved.addListener((tabId) => {
        this.removeTabRule(tabId);
      });
    }
  }

  getStatus() {
    return {
      enabled: this.enabled,
      scope: this.ruleScope,
      globalRuleIds: this.globalRuleIds,
      tabRules: Array.from(this.tabRules.entries()).map(
        ([tabId, { origin, ruleId }]) => ({ tabId, origin, ruleId })
      ),
    };
  }
}

export function createCorsHandler() {
  return new CorsHandler();
}
