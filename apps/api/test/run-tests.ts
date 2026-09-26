import assert from 'assert';
import { authService } from '../src/auth/auth.service';
import { chatsService } from '../src/chats/chats.service';
import { messagesService } from '../src/messages/messages.service';
import { usersService } from '../src/users/users.service';
import { storiesService } from '../src/stories/stories.service';
import { pollsService } from '../src/polls/polls.service';
import { prisma } from '../src/prisma';
import { UserRole } from '@dfz/types';

async function runTests() {
  console.log('🧪 Starting DFZ Messenger automated test suite...\n');

  try {
    // 1. Auth: Registration
    console.log('Test 1: User Registration');
    const testUsername = `user_${Date.now()}`;
    const regResult = await authService.register({
      username: testUsername,
      password: 'TestPassword123!',
      displayName: 'Automated Test User',
      bio: 'Testing authentication flow',
    });
    assert.strictEqual(regResult.user.username, testUsername);
    assert.ok(regResult.accessToken);
    assert.ok(regResult.refreshToken);
    console.log('  ✅ Registration successful');

    // 2. Auth: Duplicate username rejection
    console.log('Test 2: Duplicate username rejection');
    let rejected = false;
    try {
      await authService.register({
        username: testUsername,
        password: 'AnotherPassword123!',
      });
    } catch (e: any) {
      if (e.code === 'USERNAME_TAKEN') rejected = true;
    }
    assert.ok(rejected, 'Should reject duplicate username');
    console.log('  ✅ Duplicate username correctly rejected');

    // 3. Auth: Login
    console.log('Test 3: User Login');
    const loginResult = await authService.login({
      usernameOrEmail: testUsername,
      password: 'TestPassword123!',
    });
    assert.strictEqual(loginResult.user.id, regResult.user.id);
    assert.ok(loginResult.accessToken);
    console.log('  ✅ Login successful');

    // 4. Auth: Bad password rejection
    console.log('Test 4: Bad Password Rejection');
    let badPassRejected = false;
    try {
      await authService.login({
        usernameOrEmail: testUsername,
        password: 'WrongPassword!',
      });
    } catch (e: any) {
      if (e.code === 'INVALID_CREDENTIALS') badPassRejected = true;
    }
    assert.ok(badPassRejected);
    console.log('  ✅ Invalid password correctly rejected');

    // 5. User 2 creation
    const user2Name = `user2_${Date.now()}`;
    const user2 = await authService.register({
      username: user2Name,
      password: 'TestPassword123!',
      displayName: 'Automated Peer 2',
    });

    // 6. Direct Chat Creation
    console.log('Test 5: Create Direct Chat between two users');
    const chat = await chatsService.createDirectChat(regResult.user.id, user2.user.id);
    assert.ok(chat.id);
    assert.strictEqual(chat.type, 'DIRECT');
    assert.strictEqual(chat.members.length, 2);
    console.log('  ✅ Direct chat created successfully');

    // 7. Send Message
    console.log('Test 6: Send Message in Chat');
    const msg = await messagesService.sendMessage(regResult.user.id, {
      chatId: chat.id,
      content: 'Hello from automated unit test!',
    });
    assert.strictEqual(msg.content, 'Hello from automated unit test!');
    assert.strictEqual(msg.senderId, regResult.user.id);
    console.log('  ✅ Message sent and persisted');

    // 8. Edit Message
    console.log('Test 7: Edit Message');
    const editedMsg = await messagesService.editMessage(
      regResult.user.id,
      msg.id,
      'Hello (edited)!'
    );
    assert.strictEqual(editedMsg.content, 'Hello (edited)!');
    assert.strictEqual(editedMsg.isEdited, true);
    console.log('  ✅ Message edited');

    // 9. Message Cursor Pagination
    console.log('Test 8: Message Pagination');
    const history = await messagesService.getMessages(chat.id, user2.user.id, { limit: 10 });
    assert.ok(history.items.length >= 1);
    console.log('  ✅ Message history fetched with cursor pagination');

    // 10. Reactions
    console.log('Test 9: Reactions');
    const reaction = await messagesService.addReaction(user2.user.id, msg.id, '❤️');
    assert.strictEqual(reaction.emoji, '❤️');
    console.log('  ✅ Reaction added');

    // 11. Blocking restriction
    console.log('Test 10: User Blocking and Chat Restriction');
    await usersService.blockUser(user2.user.id, regResult.user.id, 'Test block');
    let messageBlocked = false;
    try {
      await messagesService.sendMessage(regResult.user.id, {
        chatId: chat.id,
        content: 'Should fail due to block',
      });
    } catch (e: any) {
      if (e.code === 'USER_BLOCKED') messageBlocked = true;
    }
    assert.ok(messageBlocked, 'Blocked user should not be able to send direct message');
    console.log('  ✅ Server-side blocking enforcement verified');

    // Unblock for subsequent tests
    await usersService.unblockUser(user2.user.id, regResult.user.id);

    // 12. Stories
    console.log('Test 11: 24-hour Stories Lifecycle');
    const story = await storiesService.createStory(regResult.user.id, {
      mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
      caption: 'Test story caption',
    });
    assert.ok(story.id);
    assert.strictEqual(story.caption, 'Test story caption');

    const feed = await storiesService.getFeed(user2.user.id);
    assert.ok(feed.length >= 1, 'Feed should include public story');

    await storiesService.recordView(user2.user.id, story.id);
    const views = await storiesService.getStoryViews(regResult.user.id, story.id);
    assert.strictEqual(views.viewCount, 1);

    const reactionRes = await storiesService.reactToStory(user2.user.id, story.id, '🔥');
    assert.strictEqual(reactionRes.action, 'added');
    console.log('  ✅ Stories creation, feed, view recording, and reactions verified');

    // 13. Polls
    console.log('Test 12: Interactive Polls Creation & Voting');
    const pollResult = await pollsService.createPoll(regResult.user.id, chat.id, {
      question: 'Which is the best modern messenger?',
      options: ['DFZ Messenger', 'Telegram', 'Signal'],
    });
    assert.ok(pollResult.poll.id);
    assert.strictEqual(pollResult.poll.options.length, 3);

    const targetOptionId = pollResult.poll.options[0].id;
    const votedPoll = await pollsService.vote(user2.user.id, pollResult.poll.id, targetOptionId);
    assert.strictEqual(votedPoll.totalVotes, 1);
    const votedOpt = votedPoll.options.find(o => o.id === targetOptionId);
    assert.ok(votedOpt);
    assert.strictEqual(votedOpt.voteCount, 1);
    assert.strictEqual(votedOpt.percentage, 100);

    const closedPoll = await pollsService.closePoll(regResult.user.id, pollResult.poll.id);
    assert.strictEqual(closedPoll.isClosed, true);
    console.log('  ✅ Poll creation, atomic voting, and closing verified');

    // 14. Topics / Forums
    console.log('Test 13: Group Forum Topics');
    const group = await chatsService.createGroup(regResult.user.id, {
      title: 'DFZ Engineering Community',
    });
    assert.ok(group.id);
    const topic = await chatsService.createTopic(group.id, regResult.user.id, {
      title: 'General Architecture',
      icon: '🏛️',
      color: '#3b82f6',
    });
    assert.ok(topic.id);
    assert.strictEqual(topic.title, 'General Architecture');

    const topics = await chatsService.getTopics(group.id, regResult.user.id);
    assert.ok(topics.length >= 1);
    assert.strictEqual(topics[0].title, 'General Architecture');
    console.log('  ✅ Forum topics creation and listing verified');

    // Clean up test data
    await prisma.user.deleteMany({
      where: { id: { in: [regResult.user.id, user2.user.id] } },
    });

    console.log('\n🎉 ALL 13 PRODUCTION INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
