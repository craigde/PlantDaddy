//
//  User.swift
//  PlantDaddy
//
//  User model matching backend schema
//

import Foundation

struct User: Codable, Identifiable {
    let id: Int
    let username: String
}

struct AuthResponse: Codable {
    let token: String
    let user: User
}

struct LoginRequest: Codable {
    let username: String
    let password: String
}

struct RegisterRequest: Codable {
    let username: String
    let password: String
}
