# Shift & Tip Tracker

Account-free React Native app for logging tipped work locally. It stores each shift and its segments transactionally in SQLite, calculates effective hourly earnings, exports CSV, restores a Pro entitlement, and encrypts same-installation backups with a device-held key.

## Development

```sh
npm install
npm test
npm run typecheck
npx expo start
```

Expo development builds are required for SQLite, secure storage, encrypted backup, and native purchases. Configure the App Store and Google Play product `shift_tip_tracker_pro_lifetime` before testing billing.

## Privacy and limits

No accounts, ads, cloud sync, payroll integration, tax filing, or data sale. Records stay on-device; CSV exports and backups leave the device only when the user shares them. The current backup key lives in SecureStore, so an exported backup is intentionally device-bound and cannot recover after reinstall or on another device. Paycheck calculations are labeled estimates, not financial advice. Store listings, portable recovery, physical-device accessibility results, and sandbox purchase evidence remain release work.

## License

MIT. See `LICENSE`.
