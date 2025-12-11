package com.example.demo.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        // No token → continue without authentication
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7); // after "Bearer "

        try {
            Claims claims = jwtService.parseClaims(token);
            Long userId = Long.valueOf(claims.getSubject());
            String role = (String) claims.get("role");

            // Avoid overriding existing authentication
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                
            List<GrantedAuthority> authorities;

            switch (role) {
                case "DRIVER" -> {
                    authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_DRIVER")
                    );
                }
                case "OWNER" -> {
                    authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_OWNER")
                    );
                }
                case "BOTH" -> {
                    authorities = List.of(
                            new SimpleGrantedAuthority("ROLE_DRIVER"),
                            new SimpleGrantedAuthority("ROLE_OWNER"),
                            new SimpleGrantedAuthority("ROLE_BOTH")
                    );
                }
                default -> {
                    authorities = List.of(); 
                }
            }

                Authentication authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId, 
                                null,
                                authorities
                        );

                ((UsernamePasswordAuthenticationToken) authentication)
                        .setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception ex) { 
            
        }

        filterChain.doFilter(request, response);
    }
}