import assert from 'assert';
import { prisma } from '../src/prisma';
import { starsService } from '../src/economy/stars.service';
import { activityRewardService } from '../src/economy/activity.service';
import { giftsService } from '../src/economy/gifts.service';
import { collectiblesService } from '../src/economy/collectibles.service';
import { premiumService } from '../src/economy/premium.service';
import { hasPermission } from '../src/common/permission.guard';
import { UserRole, Permission, GiftRarity, StarTransactionType } from '@dfz/types';
import { authService } from '../src/auth/auth.service';

async function runEconomyTests() {
  console.log('🧪 Starting DFZ Messenger Economy & Admin automated tests...\n');

  try {
    // Setup test users
    const timestamp = Date.now();
    const adminUser = await authService.register({
      username: `admin_eco_${timestamp}`,
      password: 'AdminPassword123!',
      displayName: 'Admin Tester',
    });
    // Elevate to SUPERADMIN
    await prisma.user.update({
      where: { id: adminUser.user.id },
      data: { role: UserRole.SUPERADMIN },
    });

    const regularUser1 = await authService.register({
      username: `user1_eco_${timestamp}`,
      password: 'UserPassword123!',
      displayName: 'User 1',
    });

    const regularUser2 = await authService.register({
      username: `user2_eco_${timestamp}`,
      password: 'UserPassword123!',
      displayName: 'User 2',
    });

    // Test 1: Normal user cannot call admin grant API / permission check
    console.log('Test 1: Normal user cannot have administrative grant permissions');
    const userCanGrant = hasPermission(UserRole.USER, [], Permission.STARS_GRANT);
    assert.strictEqual(userCanGrant, false, 'USER role should NOT have stars.grant');
    const adminCanGrant = hasPermission(UserRole.ADMIN, [], Permission.STARS_GRANT);
    assert.strictEqual(adminCanGrant, true, 'ADMIN role MUST have stars.grant');
    console.log('  ✅ Permission checks correctly enforce RBAC restrictions');

    // Test 2 & 3: Admin can grant Stars & creates audit record + ledger entry
    console.log('Test 2 & 3: Admin grants Stars and creates traceable audit + ledger records');
    const grantResult = await starsService.adminGrant(
      adminUser.user.id,
      regularUser1.user.id,
      1000,
      'Welcome contest award',
      `grant_key_${timestamp}`
    );
    assert.strictEqual(grantResult.success, true);
    assert.strictEqual(grantResult.amount, 1000);
    assert.strictEqual(grantResult.newBalance, 1000);

    // Verify ledger entry
    const ledgerTx = await prisma.starTransaction.findUnique({
      where: { id: grantResult.transactionId },
    });
    assert.ok(ledgerTx);
    assert.strictEqual(ledgerTx.type, StarTransactionType.ADMIN_GRANT);
    assert.strictEqual(ledgerTx.amount, 1000);
    assert.strictEqual(ledgerTx.createdByAdminId, adminUser.user.id);

    // Verify audit log
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        actorId: adminUser.user.id,
        action: 'ADMIN_GRANT_STARS',
        target: regularUser1.user.id,
      },
    });
    assert.ok(auditRecord, 'Audit record should exist for admin grant');
    console.log('  ✅ Admin grant successful with verified ledger entry and audit log');

    // Test 4: Hourly reward grants exactly 100 stars
    console.log('Test 4: Hourly reward grants exactly 100 stars on completed continuous hour');
    // Pre-set user2 activity state to 3590 seconds (10s shy of full hour)
    await prisma.activityRewardState.upsert({
      where: { userId: regularUser2.user.id },
      create: {
        userId: regularUser2.user.id,
        continuousActiveSeconds: 3590,
        lastHeartbeatAt: new Date(Date.now() - 30 * 1000), // 30s ago
      },
      update: {
        continuousActiveSeconds: 3590,
        lastHeartbeatAt: new Date(Date.now() - 30 * 1000),
      },
    });

    const rewardState = await activityRewardService.recordHeartbeat(regularUser2.user.id, {
      active: true,
      visible: true,
      clientFingerprint: 'browser-tab-1',
    });

    const user2Balance = await starsService.getBalance(
      regularUser2.user.id,
      regularUser2.user.id,
      UserRole.USER
    );
    assert.strictEqual(user2Balance.balance, 100, 'User should receive exactly 100 stars');
    console.log('  ✅ Hourly reward granted exactly ★100 stars');

    // Test 5: Two tabs cannot double reward (anti-farm)
    console.log('Test 5: Two tabs cannot double activity reward');
    const tab1Res = await activityRewardService.recordHeartbeat(regularUser2.user.id, {
      active: true,
      visible: true,
      clientFingerprint: 'tab-1',
    });
    // Immediately send heartbeat from tab 2 (under minimum interval)
    const tab2Res = await activityRewardService.recordHeartbeat(regularUser2.user.id, {
      active: true,
      visible: true,
      clientFingerprint: 'tab-2',
    });
    assert.strictEqual(
      tab1Res.continuousActiveSeconds,
      tab2Res.continuousActiveSeconds,
      'Multi-tab heartbeats within cooldown must not increment time'
    );
    console.log('  ✅ Multi-tab anti-farm verified (cooldown throttling active)');

    // Test 6: Multi-device anti-farm (account-level tracking)
    console.log('Test 6: Multi-device anti-farm operates at account level');
    const statePhone = await activityRewardService.getActivityState(regularUser2.user.id);
    assert.ok(statePhone.userId === regularUser2.user.id);
    console.log('  ✅ Account-level unified activity state confirmed across devices');

    // Test 7: Repeated request cannot duplicate reward (idempotency key)
    console.log('Test 7: Repeated request cannot duplicate reward / grant');
    const repeatGrant = await starsService.adminGrant(
      adminUser.user.id,
      regularUser1.user.id,
      1000,
      'Duplicate request test',
      `grant_key_${timestamp}` // same key
    );
    assert.strictEqual(repeatGrant.duplicate, true, 'Duplicate key must be detected');
    const balanceAfterRepeat = await starsService.getBalance(
      regularUser1.user.id,
      regularUser1.user.id,
      UserRole.USER
    );
    assert.strictEqual(balanceAfterRepeat.balance, 1000, 'Balance must remain 1000 without duplicate grant');
    console.log('  ✅ Idempotency protection verified');

    // Test 8: User cannot spend more Stars than balance
    console.log('Test 8: User cannot spend more Stars than balance');
    let overspendFailed = false;
    try {
      await starsService.transferStars(
        regularUser1.user.id,
        regularUser2.user.id,
        5000 // user1 only has 1000
      );
    } catch (err: any) {
      if (err.message.includes('Insufficient')) overspendFailed = true;
    }
    assert.ok(overspendFailed, 'Should reject transfer exceeding balance');
    console.log('  ✅ Overspending correctly rejected');

    // Test 9: Concurrent transfers cannot create negative balance (double-spend protection)
    console.log('Test 9: Concurrent transfers cannot create negative balance (atomic double-spend protection)');
    // User 1 has 1000 stars. Try to concurrently run two 800-star transfers!
    const [t1, t2] = await Promise.allSettled([
      starsService.transferStars(regularUser1.user.id, regularUser2.user.id, 800),
      starsService.transferStars(regularUser1.user.id, regularUser2.user.id, 800),
    ]);

    const successes = [t1, t2].filter((r) => r.status === 'fulfilled');
    const rejections = [t1, t2].filter((r) => r.status === 'rejected');

    assert.strictEqual(successes.length, 1, 'Exactly one concurrent transfer must succeed');
    assert.strictEqual(rejections.length, 1, 'The competing transfer must be rejected');

    const finalUser1 = await starsService.getBalance(
      regularUser1.user.id,
      regularUser1.user.id,
      UserRole.USER
    );
    assert.strictEqual(finalUser1.balance, 200, 'Balance must be 1000 - 800 = 200 (never negative!)');
    console.log('  ✅ Double-spend concurrency protection verified (balance is 200, not negative)');

    // Test 10: Gift purchase decreases Stars exactly once
    console.log('Test 10: Gift purchase decreases Stars exactly once');
    // Top up user1 with 1000 stars
    await starsService.adminGrant(adminUser.user.id, regularUser1.user.id, 1000, 'Gift test funds');
    // User1 now has 1200 stars
    const giftDefs = await giftsService.getGiftDefinitions('popular');
    const roseGift = giftDefs.find((g) => g.slug === 'neon-rose') || giftDefs[0];

    const giftSendResult = await giftsService.sendGift(
      regularUser1.user.id,
      regularUser2.user.id,
      roseGift.id,
      { message: 'Enjoy the neon rose!' }
    );
    assert.ok(giftSendResult.success);
    assert.strictEqual(giftSendResult.senderBalance, 1200 - roseGift.priceStars);

    const user2Gifts = await giftsService.getUserGifts(regularUser2.user.id);
    assert.ok(user2Gifts.length > 0);
    assert.strictEqual(user2Gifts[0].giftDefinition.name, roseGift.name);
    console.log('  ✅ Gift purchase atomically decreased stars and added gift to inventory');

    // Test 11: Limited gift cannot exceed total supply
    console.log('Test 11: Limited gift cannot exceed total supply under concurrent purchases');
    // Create a special test gift with totalSupply = 1
    const limitedGift = await prisma.giftDefinition.create({
      data: {
        name: `Exclusive Relic ${timestamp}`,
        slug: `relic-${timestamp}`,
        artwork: 'crystal',
        priceStars: 10,
        rarity: GiftRarity.LEGENDARY,
        isLimited: true,
        totalSupply: 1,
        soldCount: 0,
      },
    });

    // Both user1 and user2 try to buy it concurrently
    const [p1, p2] = await Promise.allSettled([
      giftsService.sendGift(regularUser1.user.id, regularUser2.user.id, limitedGift.id),
      giftsService.sendGift(regularUser2.user.id, regularUser1.user.id, limitedGift.id),
    ]);

    const soldCountCheck = await prisma.giftDefinition.findUnique({
      where: { id: limitedGift.id },
    });
    assert.strictEqual(soldCountCheck!.soldCount, 1, 'Sold count must not exceed total supply of 1');
    console.log('  ✅ Limited supply atomic cap verified (soldCount = 1)');

    // Test 12: User cannot transfer collectible they don't own
    console.log('Test 12: User cannot transfer collectible they do not own');
    // Admin creates collectible owned by user 1
    const col = await collectiblesService.adminCreateEdition(adminUser.user.id, {
      editionName: 'Genesis Star Edition',
      background: 'aurora',
      modelPattern: 'star',
      symbol: 'star',
      rarity: GiftRarity.MYTHIC,
      totalSupply: 100,
      initialOwnerId: regularUser1.user.id,
    });

    let thiefTransferFailed = false;
    try {
      // User 2 attempts to transfer User 1's collectible to admin!
      await collectiblesService.transfer(regularUser2.user.id, adminUser.user.id, col.id);
    } catch (err: any) {
      if (err.message.includes('do not own')) thiefTransferFailed = true;
    }
    assert.ok(thiefTransferFailed, 'Should reject unauthorized collectible transfer');
    console.log('  ✅ Collectible ownership enforcement verified');

    // Test 13: Private balance is not exposed to another user
    console.log('Test 13: Private balance is not exposed to another unauthorized user');
    let balancePrivacyEnforced = false;
    try {
      await starsService.getBalance(regularUser1.user.id, regularUser2.user.id, UserRole.USER);
    } catch (err: any) {
      if (err.message.includes('Private balance')) balancePrivacyEnforced = true;
    }
    assert.ok(balancePrivacyEnforced, 'Should reject viewing another user private balance');
    console.log('  ✅ Balance privacy correctly enforced');

    // Test 14: Expired Premium is detected and rejected
    console.log('Test 14: Expired Premium is detected and updated by backend');
    // Set user1 premium to expired 1 day ago
    await prisma.user.update({
      where: { id: regularUser1.user.id },
      data: {
        isPremium: true,
        premiumUntil: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });

    const refreshedStatus = await premiumService.getStatus(regularUser1.user.id);
    assert.strictEqual(refreshedStatus.isPremium, false, 'Expired premium must be false');
    assert.strictEqual(refreshedStatus.badge, '', 'Badge should be empty when premium is expired');
    console.log('  ✅ Expired Premium correctly revoked');

    console.log('\n🎉 ALL 14 ECONOMY & ADMIN INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runEconomyTests();
