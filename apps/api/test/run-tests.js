"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const auth_service_1 = require("../src/auth/auth.service");
const chats_service_1 = require("../src/chats/chats.service");
const messages_service_1 = require("../src/messages/messages.service");
const users_service_1 = require("../src/users/users.service");
const prisma_1 = require("../src/prisma");
async function runTests() {
    console.log('🧪 Starting DFZ Messenger automated test suite...\n');
    try {
        // 1. Auth: Registration
        console.log('Test 1: User Registration');
        const testUsername = `user_${Date.now()}`;
        const regResult = await auth_service_1.authService.register({
            username: testUsername,
            password: 'TestPassword123!',
            displayName: 'Automated Test User',
            bio: 'Testing authentication flow',
        });
        assert_1.default.strictEqual(regResult.user.username, testUsername);
        assert_1.default.ok(regResult.accessToken);
        assert_1.default.ok(regResult.refreshToken);
        console.log('  ✅ Registration successful');
        // 2. Auth: Duplicate username rejection
        console.log('Test 2: Duplicate username rejection');
        let rejected = false;
        try {
            await auth_service_1.authService.register({
                username: testUsername,
                password: 'AnotherPassword123!',
            });
        }
        catch (e) {
            if (e.code === 'USERNAME_TAKEN')
                rejected = true;
        }
        assert_1.default.ok(rejected, 'Should reject duplicate username');
        console.log('  ✅ Duplicate username correctly rejected');
        // 3. Auth: Login
        console.log('Test 3: User Login');
        const loginResult = await auth_service_1.authService.login({
            usernameOrEmail: testUsername,
            password: 'TestPassword123!',
        });
        assert_1.default.strictEqual(loginResult.user.id, regResult.user.id);
        assert_1.default.ok(loginResult.accessToken);
        console.log('  ✅ Login successful');
        // 4. Auth: Bad password rejection
        console.log('Test 4: Bad Password Rejection');
        let badPassRejected = false;
        try {
            await auth_service_1.authService.login({
                usernameOrEmail: testUsername,
                password: 'WrongPassword!',
            });
        }
        catch (e) {
            if (e.code === 'INVALID_CREDENTIALS')
                badPassRejected = true;
        }
        assert_1.default.ok(badPassRejected);
        console.log('  ✅ Invalid password correctly rejected');
        // 5. User 2 creation
        const user2Name = `user2_${Date.now()}`;
        const user2 = await auth_service_1.authService.register({
            username: user2Name,
            password: 'TestPassword123!',
            displayName: 'Automated Peer 2',
        });
        // 6. Direct Chat Creation
        console.log('Test 5: Create Direct Chat between two users');
        const chat = await chats_service_1.chatsService.createDirectChat(regResult.user.id, user2.user.id);
        assert_1.default.ok(chat.id);
        assert_1.default.strictEqual(chat.type, 'DIRECT');
        assert_1.default.strictEqual(chat.members.length, 2);
        console.log('  ✅ Direct chat created successfully');
        // 7. Send Message
        console.log('Test 6: Send Message in Chat');
        const msg = await messages_service_1.messagesService.sendMessage(regResult.user.id, {
            chatId: chat.id,
            content: 'Hello from automated unit test!',
        });
        assert_1.default.strictEqual(msg.content, 'Hello from automated unit test!');
        assert_1.default.strictEqual(msg.senderId, regResult.user.id);
        console.log('  ✅ Message sent and persisted');
        // 8. Edit Message
        console.log('Test 7: Edit Message');
        const editedMsg = await messages_service_1.messagesService.editMessage(regResult.user.id, msg.id, 'Hello (edited)!');
        assert_1.default.strictEqual(editedMsg.content, 'Hello (edited)!');
        assert_1.default.strictEqual(editedMsg.isEdited, true);
        console.log('  ✅ Message edited');
        // 9. Message Cursor Pagination
        console.log('Test 8: Message Pagination');
        const history = await messages_service_1.messagesService.getMessages(chat.id, user2.user.id, { limit: 10 });
        assert_1.default.ok(history.items.length >= 1);
        console.log('  ✅ Message history fetched with cursor pagination');
        // 10. Reactions
        console.log('Test 9: Reactions');
        const reaction = await messages_service_1.messagesService.addReaction(user2.user.id, msg.id, '❤️');
        assert_1.default.strictEqual(reaction.emoji, '❤️');
        console.log('  ✅ Reaction added');
        // 11. Blocking restriction
        console.log('Test 10: User Blocking and Chat Restriction');
        await users_service_1.usersService.blockUser(user2.user.id, regResult.user.id, 'Test block');
        let messageBlocked = false;
        try {
            await messages_service_1.messagesService.sendMessage(regResult.user.id, {
                chatId: chat.id,
                content: 'Should fail due to block',
            });
        }
        catch (e) {
            if (e.code === 'USER_BLOCKED')
                messageBlocked = true;
        }
        assert_1.default.ok(messageBlocked, 'Blocked user should not be able to send direct message');
        console.log('  ✅ Server-side blocking enforcement verified');
        // Clean up test users
        await prisma_1.prisma.user.deleteMany({
            where: { id: { in: [regResult.user.id, user2.user.id] } },
        });
        console.log('\n🎉 ALL 10 CRITICAL INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}
runTests();
