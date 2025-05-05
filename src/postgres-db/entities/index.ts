import { User } from './user.entity';
import { Thread } from './thread.entity';
import { Asset } from './asset.entity';

export * from './user.entity';
export * from './thread.entity';
export * from './asset.entity';

export const entities = [User, Thread, Asset];
