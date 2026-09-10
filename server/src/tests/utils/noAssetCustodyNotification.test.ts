import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { notifyIfNoAssetsRemainInCustody } from '../../utils/noAssetCustodyNotification.js';

jest.mock('../../db.js', () => ({
  pool: { execute: jest.fn() },
}));
jest.mock('../../utils/notificationsApi.js', () => ({
  createNotificationForApi: jest.fn(),
}));
jest.mock('../../utils/socketManager.js', () => ({
  getIoInstance: jest.fn(() => null),
}));
jest.mock('../../sockets/socketHandlers.js', () => ({
  emitNotification: jest.fn(),
}));
jest.mock('../../logger.js', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const { pool } = jest.requireMock('../../db.js') as {
  pool: { execute: jest.Mock };
};
const { createNotificationForApi } = jest.requireMock(
  '../../utils/notificationsApi.js'
) as { createNotificationForApi: jest.Mock };

describe('notifyIfNoAssetsRemainInCustody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not notify when a tangible asset remains', async () => {
    (pool.execute as any).mockResolvedValueOnce([[{ asset_id: 'asset-1' }]]);

    await expect(
      notifyIfNoAssetsRemainInCustody({
        userId: 'user-1',
        sourceType: 'return',
      })
    ).resolves.toBe(false);

    expect(pool.execute).toHaveBeenCalledTimes(1);
    expect(createNotificationForApi).not.toHaveBeenCalled();
  });

  it('does not notify when an intangible asset remains', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ intangible_asset_id: 'intangible-1' }]]);

    await expect(
      notifyIfNoAssetsRemainInCustody({
        userId: 'user-1',
        sourceType: 'intangible_deactivation',
      })
    ).resolves.toBe(false);

    expect(createNotificationForApi).not.toHaveBeenCalled();
  });

  it('notifies the user and links to the accountability documents tab when custody is empty', async () => {
    (pool.execute as any)
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]);

    await expect(
      notifyIfNoAssetsRemainInCustody({
        userId: 'user-1',
        sourceType: 'transfer',
        sourceId: 'transfer-form-1',
      })
    ).resolves.toBe(true);

    expect(createNotificationForApi).toHaveBeenCalledWith({
      user_id: 'user-1',
      title: 'No asset remains in custody',
      message: 'You can now generate your accountability clearance form.',
      type: 'system',
      data: {
        route: '/profile?tab=documents&docTab=accountability',
        actionTarget: 'accountability_clearance_ready',
        sourceType: 'transfer',
        sourceId: 'transfer-form-1',
      },
    });
  });
});
