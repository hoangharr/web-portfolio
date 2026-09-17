package com.hoangdm.aptis.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RememberDeviceAuthenticationFilter extends OncePerRequestFilter {
  private final RememberDeviceService rememberDevices;
  public RememberDeviceAuthenticationFilter(RememberDeviceService rememberDevices) { this.rememberDevices = rememberDevices; }
  @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
    if (SecurityContextHolder.getContext().getAuthentication() == null) rememberDevices.restore(request, response).ifPresent(authentication -> { SecurityContextHolder.getContext().setAuthentication(authentication); request.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, SecurityContextHolder.getContext()); });
    chain.doFilter(request, response);
  }
}
