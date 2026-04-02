# Assignment 2 Documentation

## Process Synchronization and Deadlock Simulation

### Course
CS313 - Operating System Concepts

### Submitted By
| Name | Registration No. |
|---|---|
| Babar Naeem | 8963 |
| Hamid Saleem | 9061 |
| Muhammad Sabeel | 8926 |
| Abdul Sami | 8929 |

### Assignment Title
Assignment 2: Process Synchronization and Deadlock Simulation

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Assignment Requirements](#2-assignment-requirements)
3. [Project Overview](#3-project-overview)
4. [Objectives](#4-objectives)
5. [System Features](#5-system-features)
6. [Technologies Used](#6-technologies-used)
7. [System Design](#7-system-design)
8. [Working of the Simulation](#8-working-of-the-simulation)
9. [Synchronization Techniques Implemented](#9-synchronization-techniques-implemented)
10. [Deadlock Handling](#10-deadlock-handling)
11. [Banker's Algorithm in the Project](#11-bankers-algorithm-in-the-project)
12. [User Interface Description](#12-user-interface-description)
13. [How to Use the Simulator](#13-how-to-use-the-simulator)
14. [Sample Scenario](#14-sample-scenario)
15. [Core Logic Summary](#15-core-logic-summary)
16. [Files and Their Purpose](#16-files-and-their-purpose)
17. [Expected Output](#17-expected-output)
18. [Limitations](#18-limitations)
19. [Conclusion](#19-conclusion)

---

## 1. Introduction

This assignment focuses on two important operating system concepts: process synchronization and deadlock management. In a multitasking operating system, many processes run at the same time and often need to use shared resources such as files, memory blocks, printers, or devices. If these resources are not managed properly, processes can interfere with each other or become permanently blocked.

The purpose of this project is to simulate how an operating system controls access to shared resources, prevents unsafe execution, detects deadlocks, and resolves them when they occur. The simulator provides a visual and interactive environment where users can create resources, define process dependencies, and observe how synchronization and deadlock algorithms work in practice.

---

## 2. Assignment Requirements

According to Assignment 2, the system was required to:

- implement process synchronization using semaphores, mutexes, and critical section protocols
- ensure processes do not interfere while accessing shared resources
- simulate deadlock scenarios where processes wait for resources held by other processes
- implement deadlock detection and resolution algorithms
- apply Banker's Algorithm for safety checking
- provide functionality for dependent processes that compete for the same files or memory

This documentation explains how those requirements were implemented in the final solution.

---

## 3. Project Overview

The developed system is a browser-based Operating System Simulation Tool for Assignment 2. It is designed to simulate shared resource usage among multiple processes. Each process can:

- hold one or more resources
- request additional resources
- compete for entry into a critical section
- become blocked while waiting
- participate in a deadlock cycle
- be resolved through deadlock recovery logic

The application allows the user to define resources and processes manually, or load a prebuilt deadlock example to quickly demonstrate circular wait conditions.

---

## 4. Objectives

The main objectives of this assignment were:

- to understand how synchronization protects shared resources
- to simulate process interaction in a shared environment
- to detect unsafe states and circular waiting
- to resolve deadlocks in a practical way
- to visualize process states and system behavior in real time
- to strengthen understanding of operating system resource allocation

---

## 5. System Features

The developed simulator includes the following features:

- addition of shared resources such as files and memory blocks
- addition of processes with:
  - initial allocation
  - outstanding request
  - maximum demand
  - shared resource target
  - critical section duration
- support for three synchronization modes:
  - mutex
  - semaphore
  - critical section queue
- deadlock detection using a wait-for graph model
- deadlock resolution through victim process abortion and resource release
- Banker's Algorithm safety analysis
- live process state tracking
- resource availability monitoring
- event log for each important action
- critical section timeline visualization
- classic deadlock sample loading for demonstration

---

## 6. Technologies Used

The project was implemented using:

- HTML for page structure
- CSS for interface design and layout
- JavaScript for simulation logic and interactivity

No external backend or database was used. The complete project runs in the browser as a self-contained simulation.

---

## 7. System Design

The simulator is divided into three major layers.

### 7.1 Interface Layer

This layer provides input controls, buttons, tables, and visual panels. It allows the user to:

- select synchronization mode
- choose deadlock strategy
- add resources
- add processes
- run the simulation
- execute one step at a time
- reset or clear the simulation

### 7.2 Simulation Layer

This is the main logic layer. It stores:

- the list of resources
- the list of processes
- the current time tick
- timeline records
- event logs
- safety sequence information

It is responsible for managing state transitions such as:

- ready
- running
- blocked
- completed
- aborted

### 7.3 Analysis Layer

This layer performs:

- deadlock detection
- wait-for relationship generation
- Banker's Algorithm safety checks
- deadlock recovery decisions

---

## 8. Working of the Simulation

The simulator works step by step, just like a simplified operating system scheduler for shared resource access.

### 8.1 Resource Creation

The user first adds resources. Each resource has:

- a name
- a type
- total available units

Examples:

- `FileA`
- `FileB`
- `Memory1`

### 8.2 Process Creation

Each process is created with:

- process name
- critical section duration
- initial allocation
- outstanding request
- maximum demand
- shared resource focus

This structure allows the system to model process dependencies accurately.

### 8.3 Execution

When the user starts the simulation:

- the simulation advances in time steps
- running processes spend time inside the critical section
- blocked processes try to acquire required resources
- synchronization rules determine who can enter
- deadlock detection checks for circular wait
- Banker mode checks whether a request is safe before granting it

### 8.4 Completion

When a process finishes:

- it releases its allocated resources
- its state becomes completed
- waiting processes may become able to continue

---

## 9. Synchronization Techniques Implemented

### 9.1 Mutex

Mutex provides mutual exclusion. Only one process can access a critical section for a shared target at a time. If another process tries to enter while the critical section is occupied, it is blocked.

This mode is useful when the resource must be used by only one process at a time, such as a single file being modified.

### 9.2 Semaphore

Semaphore allows more than one process to enter if the resource has multiple units. For example, if a memory resource has two units, two processes may be allowed simultaneously depending on availability.

This simulates controlled concurrent access.

### 9.3 Critical Section Queue

This mode behaves like strict serialized access. One process enters the critical section while others wait in order until the resource becomes free.

This demonstrates classical critical section behavior where processes must not overlap while using the same shared target.

---

## 10. Deadlock Handling

Deadlock occurs when processes are blocked forever because each one is waiting for a resource held by another process.

The simulator identifies deadlock by constructing wait-for relationships between blocked processes.

### 10.1 Deadlock Conditions Represented

The simulation reflects the standard deadlock conditions:

- mutual exclusion
- hold and wait
- no preemption
- circular wait

### 10.2 Detection

The system checks blocked processes and builds a wait-for graph:

- if process `P1` waits for a resource held by `P2`, then an edge is formed from `P1` to `P2`
- if a cycle exists, the system reports deadlock

### 10.3 Resolution

In detect-and-resolve mode, the system selects a victim process from the deadlocked group. The selected process is aborted, its resources are released, and the remaining blocked processes can proceed if resources become available.

This demonstrates practical deadlock recovery.

---

## 11. Banker's Algorithm in the Project

Banker's Algorithm is used to test whether granting a resource request will keep the system in a safe state.

### 11.1 Input Data Used

For each process, the system uses:

- current allocation
- maximum demand
- remaining need

For each resource, the system uses:

- total units
- available units

### 11.2 Safety Check

Before granting a request in banker mode, the simulator:

1. temporarily assumes the request is granted
2. computes available resources
3. tries to find a safe sequence in which all processes can finish
4. grants the request only if such a safe sequence exists

### 11.3 Output

The safe sequence is displayed in the dashboard. If no safe sequence exists, the system marks the state as unsafe and defers the request.

This directly satisfies the assignment requirement of real-time deadlock detection and prevention support using Banker’s Algorithm.

---

## 12. User Interface Description

The interface is designed to be clean and easy to demonstrate.

### 12.1 Left Panel

The left side contains controls for:

- synchronization mode
- deadlock strategy
- simulation speed
- adding resources
- adding processes
- running or stepping the simulation
- resetting or clearing the system

### 12.2 Right Panel

The right side contains:

- system statistics
- shared resource cards
- process dependency table
- wait-for graph
- critical section timeline
- event log

### 12.3 Statistics Section

This section shows:

- total configured processes
- blocked processes
- deadlock status
- safe sequence

These values update during execution.

---

## 13. How to Use the Simulator

The simulator can be used with the following steps:

1. Open the application in a browser.
2. Add shared resources such as files or memory units.
3. Add processes and define their allocations and requests.
4. Select synchronization mode:
   - mutex
   - semaphore
   - critical section queue
5. Select deadlock strategy:
   - detect and resolve
   - banker
6. Click `Run` to execute continuously or `Step` to execute one tick at a time.
7. Observe:
   - process states
   - resource availability
   - event log
   - wait-for graph
   - safe sequence
8. If a deadlock appears, use `Resolve Deadlock` or allow the automatic resolution mode to handle it.

---

## 14. Sample Scenario

One built-in scenario demonstrates a classic deadlock:

### Scenario

- `P1` holds `FileA` and requests `FileB`
- `P2` holds `FileB` and requests `FileA`

### Result

- `P1` waits for `P2`
- `P2` waits for `P1`
- a circular wait is formed
- deadlock is detected
- the simulator resolves the deadlock by selecting one process as victim

This scenario is useful for demonstration in class and report discussion.

---

## 15. Core Logic Summary

The main logic of the simulator includes:

### 15.1 State Management

Each process is tracked through states:

- ready
- running
- blocked
- completed
- aborted

### 15.2 Resource Availability

For each resource, the system calculates:

`available = total - allocated`

### 15.3 Outstanding Need

The system checks what a process still requires before it can run safely.

### 15.4 Wait-For Graph

Blocked processes maintain a list of other processes they are waiting on. This data is used to detect cycles.

### 15.5 Timeline Recording

Each time a process enters the critical section, the current tick and resource target are stored for display in the timeline panel.

### 15.6 Event Logging

Important simulation events are recorded, including:

- resource creation
- process creation
- entry into critical section
- blocking
- deadlock detection
- deadlock resolution
- process completion

---

## 16. Files and Their Purpose

### `index.html`

Contains the application structure, panels, forms, tables, and visualization containers.

### `style.css`

Contains all styling for layout, colors, cards, tables, buttons, logs, and responsive behavior.

### `script.js`

Contains the complete simulation logic, including:

- resource handling
- process handling
- synchronization control
- deadlock detection
- Banker's Algorithm safety check
- event log updates
- visualization updates

---

## 17. Expected Output

After running the simulator, the user should be able to see:

- current process states
- which processes are blocked
- which resources are available
- whether the system is safe, unsafe, or deadlocked
- the current safe sequence in banker mode
- the critical section execution timeline
- the wait-for graph
- a detailed event log

The system should clearly show how synchronization and deadlock management work together.

---

## 18. Limitations

Although the simulator fulfills the assignment requirements, some limitations remain:

- it is a conceptual simulation, not a real kernel-level operating system
- process execution is simplified into ticks and critical section duration
- recovery uses victim abortion rather than multiple advanced recovery policies
- visualization is limited to the browser interface
- resource allocation is modeled for understanding, not real hardware scheduling

These limitations are acceptable because the goal of the assignment is educational simulation.

---

## 19. Conclusion

This project successfully implements Assignment 2 by simulating process synchronization and deadlock management in a clean and interactive way. The system supports mutexes, semaphores, critical section control, deadlock detection, deadlock resolution, and Banker's Algorithm safety analysis. It allows users to understand how operating systems manage shared resources and how poor coordination between processes can lead to blocking and deadlock.

The simulator also provides a practical visual demonstration of core operating system concepts, making it useful for both academic submission and classroom presentation.

---

## End of Document

