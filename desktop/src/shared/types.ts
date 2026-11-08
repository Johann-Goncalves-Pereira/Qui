/*
 * Copyright (c) 2026, s0up and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { Schema } from 'effect'

export const DockerContainerStatusSchema = Schema.Struct({
	name: Schema.String,
	state: Schema.String,
	status: Schema.String,
	image: Schema.String,
	port: Schema.Number,
})

export type DockerContainerStatus = typeof DockerContainerStatusSchema.Type
export const PodmanContainerStatusSchema = DockerContainerStatusSchema
export type PodmanContainerStatus = DockerContainerStatus

export const DockerUpdateInfoSchema = Schema.Struct({
	hasUpdate: Schema.Boolean,
	image: Schema.String,
	localDigest: Schema.String,
	remoteDigest: Schema.String,
})

export type DockerUpdateInfo = typeof DockerUpdateInfoSchema.Type
export const PodmanUpdateInfoSchema = DockerUpdateInfoSchema
export type PodmanUpdateInfo = DockerUpdateInfo

export const TorrentTransferStatsSchema = Schema.Struct({
	dlSpeed: Schema.Number,
	upSpeed: Schema.Number,
	activeCount: Schema.Number,
	totalCount: Schema.Number,
})

export type TorrentTransferStats = typeof TorrentTransferStatsSchema.Type

export const BiometricAuthResultSchema = Schema.Struct({
	success: Schema.Boolean,
	error: Schema.optional(Schema.String),
})

export type BiometricAuthResult = typeof BiometricAuthResultSchema.Type

export const DesktopConfigSchema = Schema.Struct({
	quiUrl: Schema.String,
	qbitUrl: Schema.String,
	enableTouchId: Schema.Boolean,
	theme: Schema.String,
	minimizeToTray: Schema.Boolean,
	autoUpdateImages: Schema.Boolean,
})

export type DesktopConfig = typeof DesktopConfigSchema.Type

export const AppReleaseInfoSchema = Schema.Struct({
	hasUpdate: Schema.Boolean,
	currentVersion: Schema.String,
	latestVersion: Schema.String,
	tagName: Schema.String,
	name: Schema.String,
	body: Schema.String,
	htmlUrl: Schema.String,
	downloadUrl: Schema.optional(Schema.String),
	publishedAt: Schema.String,
})

export type AppReleaseInfo = typeof AppReleaseInfoSchema.Type

export const QuiContainerConfigSchema = Schema.Struct({
	port: Schema.Number,
	configPath: Schema.String,
	dataPath: Schema.optional(Schema.String),
	puid: Schema.optional(Schema.String),
	pgid: Schema.optional(Schema.String),
	umask: Schema.optional(Schema.String),
	logLevel: Schema.optional(Schema.String),
	baseUrl: Schema.optional(Schema.String),
	tz: Schema.optional(Schema.String),
	restartPolicy: Schema.String,
	image: Schema.String,
})

export type QuiContainerConfig = typeof QuiContainerConfigSchema.Type

export const QBitContainerConfigSchema = Schema.Struct({
	port: Schema.Number,
	peerPort: Schema.Number,
	configPath: Schema.String,
	downloadsPath: Schema.String,
	puid: Schema.optional(Schema.String),
	pgid: Schema.optional(Schema.String),
	umask: Schema.optional(Schema.String),
	tz: Schema.optional(Schema.String),
	restartPolicy: Schema.String,
	image: Schema.String,
	username: Schema.optional(Schema.String),
	password: Schema.optional(Schema.String),
	isTemporaryPassword: Schema.optional(Schema.Boolean),
})

export type QBitContainerConfig = typeof QBitContainerConfigSchema.Type

export const ThemeSyncPayloadSchema = Schema.Struct({
	id: Schema.String,
	name: Schema.optional(Schema.String),
	isDark: Schema.optional(Schema.Boolean),
	cssVars: Schema.optional(
		Schema.Struct({
			light: Schema.optional(
				Schema.Record({ key: Schema.String, value: Schema.String }),
			),
			dark: Schema.optional(
				Schema.Record({ key: Schema.String, value: Schema.String }),
			),
		}),
	),
	rawCss: Schema.optional(Schema.String),
})

export type ThemeSyncPayload = typeof ThemeSyncPayloadSchema.Type

export const VpnConfigSchema = Schema.Struct({
	enabled: Schema.Boolean,
	provider: Schema.String,
	wireguardPrivateKey: Schema.optional(Schema.String),
	wireguardAddress: Schema.optional(Schema.String),
	serverCountry: Schema.optional(Schema.String),
	killSwitchOnly: Schema.optional(Schema.Boolean),
})

export type VpnConfig = typeof VpnConfigSchema.Type
