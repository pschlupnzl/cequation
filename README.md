# cequation

Parses and evaluates equations by converting the string into a reverse Polish notation stack and evaluating it. The equation can include trigonometric functions such as `sin()` and arbitrarily named variables.

## example

Equation
```
x + sin(y*pi)
```
with variables 
```
    x= 5 
    y= 0.250 
```
will yield 
```
    Ans = 5.707107 
```

Overflow errors such as `exp(+1e3)` are not captured.
