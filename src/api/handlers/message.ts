import { botID } from "../../bot.ts";
import { RequestManager } from "../../rest/request_manager.ts";
import {
  Errors,
  MessageContent,
  MessageCreateOptions,
  UserPayload,
} from "../../types/mod.ts";
import { endpoints } from "../../util/constants.ts";
import { botHasChannelPermissions } from "../../util/permissions.ts";
import { delay } from "../../util/utils.ts";
import { cacheHandlers } from "../controllers/cache.ts";
import { Message, structures } from "../structures/mod.ts";

/** Delete a message with the channel id and message id only. */
export async function deleteMessageByID(
  channelID: string,
  messageID: string,
  reason?: string,
  delayMilliseconds = 0,
) {
  const message = await cacheHandlers.get("messages", messageID);
  if (message) return deleteMessage(message, reason, delayMilliseconds);

  if (delayMilliseconds) await delay(delayMilliseconds);

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE(channelID, messageID),
    { reason },
  );

  return result;
}

/** Delete a message */
export async function deleteMessage(
  message: Message,
  reason?: string,
  delayMilliseconds = 0,
) {
  if (message.author.id !== botID) {
    // This needs to check the channels permission not the guild permission
    const hasManageMessages = await botHasChannelPermissions(
      message.channelID,
      ["MANAGE_MESSAGES"],
    );
    if (
      !hasManageMessages
    ) {
      throw new Error(Errors.MISSING_MANAGE_MESSAGES);
    }
  }

  if (delayMilliseconds) await delay(delayMilliseconds);

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE(message.channelID, message.id),
    { reason },
  );

  return result;
}

/** Pin a message in a channel. Requires MANAGE_MESSAGES. Max pins allowed in a channel = 50. */
export async function pin(channelID: string, messageID: string) {
  const hasManageMessagesPerm = await botHasChannelPermissions(
    channelID,
    ["MANAGE_MESSAGES"],
  );
  if (
    !hasManageMessagesPerm
  ) {
    throw new Error(Errors.MISSING_MANAGE_MESSAGES);
  }

  const result = await RequestManager.put(
    endpoints.CHANNEL_PIN(channelID, messageID),
  );

  return result;
}

/** Unpin a message in a channel. Requires MANAGE_MESSAGES. */
export async function unpin(channelID: string, messageID: string) {
  const hasManageMessagesPerm = await botHasChannelPermissions(
    channelID,
    ["MANAGE_MESSAGES"],
  );
  if (
    !hasManageMessagesPerm
  ) {
    throw new Error(Errors.MISSING_MANAGE_MESSAGES);
  }

  const result = await RequestManager.delete(
    endpoints.CHANNEL_PIN(channelID, messageID),
  );

  return result;
}

/** Create a reaction for the message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. Requires READ_MESSAGE_HISTORY and ADD_REACTIONS */
export async function addReaction(
  channelID: string,
  messageID: string,
  reaction: string,
) {
  const hasAddReactionsPerm = await botHasChannelPermissions(
    channelID,
    ["ADD_REACTIONS"],
  );
  if (!hasAddReactionsPerm) {
    throw new Error(Errors.MISSING_ADD_REACTIONS);
  }

  const hasReadMessageHistoryPerm = await botHasChannelPermissions(
    channelID,
    ["READ_MESSAGE_HISTORY"],
  );
  if (
    !hasReadMessageHistoryPerm
  ) {
    throw new Error(Errors.MISSING_READ_MESSAGE_HISTORY);
  }

  if (reaction.startsWith("<:")) {
    reaction = reaction.substring(2, reaction.length - 1);
  } else if (reaction.startsWith("<a:")) {
    reaction = reaction.substring(3, reaction.length - 1);
  }

  const result = await RequestManager.put(
    endpoints.CHANNEL_MESSAGE_REACTION_ME(
      channelID,
      messageID,
      reaction,
    ),
  );

  return result;
}

// TODO: add a return?
/** Adds multiple reactions to a message. If `ordered` is true(default is false), it will add the reactions one at a time in the order provided. Note: Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. Requires READ_MESSAGE_HISTORY and ADD_REACTIONS */
export async function addReactions(
  channelID: string,
  messageID: string,
  reactions: string[],
  ordered = false,
) {
  if (!ordered) {
    await Promise.all(
      reactions.map((reaction) => addReaction(channelID, messageID, reaction)),
    );
  } else {
    for (const reaction of reactions) {
      await addReaction(channelID, messageID, reaction);
    }
  }
}

/** Removes a reaction from the bot on this message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. */
export async function removeReaction(
  channelID: string,
  messageID: string,
  reaction: string,
) {
  if (reaction.startsWith("<:")) {
    reaction = reaction.substring(2, reaction.length - 1);
  } else if (reaction.startsWith("<a:")) {
    reaction = reaction.substring(3, reaction.length - 1);
  }

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE_REACTION_ME(
      channelID,
      messageID,
      reaction,
    ),
  );

  return result;
}

/** Removes a reaction from the specified user on this message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. */
export async function removeUserReaction(
  channelID: string,
  messageID: string,
  reaction: string,
  userID: string,
) {
  const hasManageMessagesPerm = await botHasChannelPermissions(
    channelID,
    ["MANAGE_MESSAGES"],
  );
  if (!hasManageMessagesPerm) {
    throw new Error(Errors.MISSING_MANAGE_MESSAGES);
  }

  if (reaction.startsWith("<:")) {
    reaction = reaction.substring(2, reaction.length - 1);
  } else if (reaction.startsWith("<a:")) {
    reaction = reaction.substring(3, reaction.length - 1);
  }

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE_REACTION_USER(
      channelID,
      messageID,
      reaction,
      userID,
    ),
  );

  return result;
}

/** Removes all reactions for all emojis on this message. */
export async function removeAllReactions(channelID: string, messageID: string) {
  const hasManageMessagesPerm = await botHasChannelPermissions(
    channelID,
    ["MANAGE_MESSAGES"],
  );
  if (
    !hasManageMessagesPerm
  ) {
    throw new Error(Errors.MISSING_MANAGE_MESSAGES);
  }

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE_REACTIONS(channelID, messageID),
  );

  return result;
}

/** Removes all reactions for a single emoji on this message. Reaction takes the form of **name:id** for custom guild emoji, or Unicode characters. */
export async function removeReactionEmoji(
  channelID: string,
  messageID: string,
  reaction: string,
) {
  const hasManageMessagesPerm = await botHasChannelPermissions(
    channelID,
    ["MANAGE_MESSAGES"],
  );
  if (
    !hasManageMessagesPerm
  ) {
    throw new Error(Errors.MISSING_MANAGE_MESSAGES);
  }

  if (reaction.startsWith("<:")) {
    reaction = reaction.substring(2, reaction.length - 1);
  } else if (reaction.startsWith("<a:")) {
    reaction = reaction.substring(3, reaction.length - 1);
  }

  const result = await RequestManager.delete(
    endpoints.CHANNEL_MESSAGE_REACTION(channelID, messageID, reaction),
  );

  return result;
}

/** Get a list of users that reacted with this emoji. */
export async function getReactions(message: Message, reaction: string) {
  const result = (await RequestManager.get(
    endpoints.CHANNEL_MESSAGE_REACTION(message.channelID, message.id, reaction),
  )) as UserPayload[];

  return Promise.all(result.map(async (res) => {
    const member = await cacheHandlers.get("members", res.id);
    return member || res;
  }));
}

/** Edit the message. */
export async function editMessage(
  message: Message,
  content: string | MessageContent,
) {
  if (
    message.author.id !== botID
  ) {
    throw "You can only edit a message that was sent by the bot.";
  }

  if (typeof content === "string") content = { content };

  const hasSendMessagesPerm = await botHasChannelPermissions(
    message.channelID,
    ["SEND_MESSAGES"],
  );
  if (
    !hasSendMessagesPerm
  ) {
    throw new Error(Errors.MISSING_SEND_MESSAGES);
  }

  const hasSendTtsMessagesPerm = await botHasChannelPermissions(
    message.channelID,
    ["SEND_TTS_MESSAGES"],
  );
  if (
    content.tts &&
    !hasSendTtsMessagesPerm
  ) {
    throw new Error(Errors.MISSING_SEND_TTS_MESSAGE);
  }

  if (content.content && content.content.length > 2000) {
    throw new Error(Errors.MESSAGE_MAX_LENGTH);
  }

  const result = await RequestManager.patch(
    endpoints.CHANNEL_MESSAGE(message.channelID, message.id),
    content,
  );

  return structures.createMessage(result as MessageCreateOptions);
}

/** Crosspost a message in a News Channel to following channels. */
export async function publishMessage(channelID: string, messageID: string) {
  const data = await RequestManager.post(
    endpoints.CHANNEL_MESSAGE_CROSSPOST(channelID, messageID),
  ) as MessageCreateOptions;

  return structures.createMessage(data);
}
