import { post } from "./httpClient.js";

export const usersService = {
  createUser: (payload) =>
    post("user-request/create/", payload, { base: "scraper", auth: true }),
  closeAllTask: (payload) =>
    post("close-user-all-task/", payload, { base: "scraper", auth: true }),
};
