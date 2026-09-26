import { prisma } from '../prisma';
import { gatewayInstance } from '../gateway/websocket.gateway';
import { Poll } from '@dfz/types';

export class PollsService {
  /**
   * Create a poll attached to a message
   */
  async createPoll(
    userId: string,
    chatId: string,
    data: {
      question: string;
      options: string[];
      isAnonymous?: boolean;
      allowMultiple?: boolean;
    }
  ) {
    if (data.options.length < 2 || data.options.length > 10) {
      throw new Error('A poll must have between 2 and 10 options');
    }

    // Verify chat membership
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!member) {
      throw new Error('You are not a member of this chat');
    }

    // Transaction: Create message of type POLL and associated Poll entity with options
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          chatId,
          senderId: userId,
          type: 'POLL',
          content: data.question,
        },
        include: {
          sender: {
            select: { id: true, username: true, profile: true },
          },
        },
      });

      const poll = await tx.poll.create({
        data: {
          chatId,
          messageId: message.id,
          question: data.question,
          isAnonymous: data.isAnonymous ?? false,
          allowMultiple: data.allowMultiple ?? false,
          options: {
            create: data.options.map((opt) => ({
              text: opt,
              voteCount: 0,
            })),
          },
        },
        include: {
          options: true,
        },
      });

      return { message, poll };
    });

    const formattedPoll: Poll = {
      id: result.poll.id,
      chatId: result.poll.chatId,
      messageId: result.poll.messageId,
      question: result.poll.question,
      isAnonymous: result.poll.isAnonymous,
      allowMultiple: result.poll.allowMultiple,
      isClosed: result.poll.isClosed,
      createdAt: result.poll.createdAt.toISOString(),
      totalVotes: 0,
      hasVoted: false,
      userVotes: [],
      options: result.poll.options.map((opt) => ({
        id: opt.id,
        pollId: opt.pollId,
        text: opt.text,
        voteCount: 0,
        percentage: 0,
        hasVoted: false,
      })),
    };

    const fullMessage = {
      ...result.message,
      createdAt: result.message.createdAt.toISOString(),
      updatedAt: result.message.updatedAt.toISOString(),
      poll: formattedPoll,
    };

    if (gatewayInstance) {
      gatewayInstance.broadcastToChat(chatId, 'message:new', {
        message: fullMessage,
      });
    }

    return { message: fullMessage, poll: formattedPoll };
  }

  /**
   * Cast or toggle a vote on a poll
   */
  async vote(userId: string, pollId: string, optionId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        votes: { where: { userId } },
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.isClosed) {
      throw new Error('This poll is closed');
    }

    // Verify option exists in this poll
    const targetOption = poll.options.find((o) => o.id === optionId);
    if (!targetOption) {
      throw new Error('Invalid option for this poll');
    }

    const existingVote = poll.votes.find((v) => v.optionId === optionId);

    await prisma.$transaction(async (tx) => {
      if (existingVote) {
        // Unvote
        await tx.pollVote.delete({
          where: { id: existingVote.id },
        });
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { decrement: 1 } },
        });
      } else {
        // If single choice, remove all existing user votes on this poll
        if (!poll.allowMultiple && poll.votes.length > 0) {
          for (const v of poll.votes) {
            await tx.pollVote.delete({ where: { id: v.id } });
            await tx.pollOption.update({
              where: { id: v.optionId },
              data: { voteCount: { decrement: 1 } },
            });
          }
        }

        // Add new vote
        await tx.pollVote.create({
          data: {
            pollId,
            optionId,
            userId,
          },
        });
        await tx.pollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } },
        });
      }
    });

    // Re-fetch updated poll
    const updated = await this.getPollDetails(userId, pollId);

    // Broadcast poll update to chat
    if (gatewayInstance) {
      gatewayInstance.broadcastToChat(poll.chatId, 'poll:updated', {
        chatId: poll.chatId,
        messageId: poll.messageId,
        poll: updated,
      });
    }

    return updated;
  }

  /**
   * Get formatted poll details for a user
   */
  async getPollDetails(userId: string, pollId: string): Promise<Poll> {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          orderBy: { id: 'asc' },
        },
        votes: true,
      },
    });

    if (!poll) {
      throw new Error('Poll not found');
    }

    const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);
    const userVotes = poll.votes.filter((v) => v.userId === userId).map((v) => v.optionId);

    return {
      id: poll.id,
      chatId: poll.chatId,
      messageId: poll.messageId,
      question: poll.question,
      isAnonymous: poll.isAnonymous,
      allowMultiple: poll.allowMultiple,
      isClosed: poll.isClosed,
      createdAt: poll.createdAt.toISOString(),
      totalVotes,
      hasVoted: userVotes.length > 0,
      userVotes,
      options: poll.options.map((opt) => ({
        id: opt.id,
        pollId: opt.pollId,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0,
        hasVoted: userVotes.includes(opt.id),
      })),
    };
  }

  /**
   * Close a poll
   */
  async closePoll(userId: string, pollId: string) {
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: { message: true },
    });

    if (!poll) throw new Error('Poll not found');

    if (poll.message.senderId !== userId) {
      // Check if admin of the chat
      const member = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId: poll.chatId, userId } },
      });
      if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
        throw new Error('Unauthorized to close this poll');
      }
    }

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: { isClosed: true },
    });

    const pollDetails = await this.getPollDetails(userId, pollId);

    if (gatewayInstance) {
      gatewayInstance.broadcastToChat(poll.chatId, 'poll:updated', {
        chatId: poll.chatId,
        messageId: poll.messageId,
        poll: pollDetails,
      });
    }

    return pollDetails;
  }
}

export const pollsService = new PollsService();
